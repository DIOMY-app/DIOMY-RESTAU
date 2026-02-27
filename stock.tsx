/**
 * Stock Management Screen - O'PIED DU MONT Mobile
 * Gestion des permissions : Lecture seule pour les serveurs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';

// @ts-ignore
import { ScreenContainer } from '../components/screen-container';
// @ts-ignore
import { useColors } from '../hooks/use-colors';
// @ts-ignore
import { supabase } from '../supabase';
// @ts-ignore
import { useApp } from '../lib/app-context';

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  max_quantity: number;
}

export default function StockScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Vérification du rôle (Règle n°3)
  // Seuls admin, manager et chef peuvent modifier le stock.
  const canEdit = ['admin', 'manager', 'chef'].includes(state.user?.role || '');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible de charger le stock: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (!canEdit) return; // Sécurité supplémentaire

    const finalQty = Math.max(0, newQuantity);
    
    // Mise à jour optimiste
    setStockItems(current => 
      current.map(item => item.id === id ? { ...item, quantity: finalQty } : item)
    );

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantity: finalQty })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Erreur sync", "La mise à jour a échoué.");
      fetchStock(); 
    }
  };

  const getStockStatus = (q: number, min: number, max: number) => {
    if (q <= min) return 'low';
    if (q >= max) return 'high';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    if (status === 'low') return '#ef4444';
    if (status === 'high') return '#22c55e';
    return colors.primary;
  };

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && stockItems.length === 0) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
        <View style={styles.gap4}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Stock</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {canEdit ? "Mode Gestionnaire" : "Mode Consultation (Serveur)"}
            </Text>
            <TextInput
              style={[styles.searchInput, {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.foreground,
              }]}
              placeholder="Rechercher une boisson ou ingrédient..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.gap3}>
            {filteredItems.map(item => {
              const status = getStockStatus(item.quantity, item.min_quantity, item.max_quantity);
              const statusColor = getStatusColor(status);

              return (
                <View
                  key={item.id}
                  style={[styles.itemCard, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: statusColor,
                  }]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.flex1}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={[styles.itemQty, { color: statusColor, fontWeight: '700' }]}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {status === 'low' ? 'À RÉAPPROVISIONNER' : status === 'high' ? 'STOCK OK' : 'NORMAL'}
                      </Text>
                    </View>
                  </View>

                  {/* Contrôles masqués ou affichés selon le rôle */}
                  {canEdit ? (
                    <View style={styles.controlsRow}>
                      <TouchableOpacity
                        style={[styles.btnQty, { backgroundColor: colors.border }]}
                        onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Text style={[styles.btnText, { color: colors.foreground }]}>−</Text>
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.qtyInput, {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                          color: colors.foreground,
                        }]}
                        value={item.quantity.toString()}
                        onChangeText={(text) => handleUpdateQuantity(item.id, parseInt(text) || 0)}
                        keyboardType="numeric"
                      />

                      <TouchableOpacity
                        style={[styles.btnQty, { backgroundColor: colors.primary }]}
                        onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Text style={[styles.btnText, { color: '#fff' }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.readOnlyInfo}>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Seul le gérant peut modifier les quantités.
                      </Text>
                    </View>
                  )}

                  <View style={styles.rangeRow}>
                    <Text style={styles.rangeText}>Seuil min: {item.min_quantity}</Text>
                    <Text style={styles.rangeText}>Capacité max: {item.max_quantity}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Alertes Stock</Text>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.muted }}>Critique (Stock Faible)</Text>
              <Text style={[styles.bold, { color: '#ef4444' }]}>
                {stockItems.filter(i => i.quantity <= i.min_quantity).length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPadding: { padding: 16, paddingBottom: 40 },
  gap4: { gap: 16 },
  gap3: { gap: 12 },
  flex1: { flex: 1 },
  title: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginBottom: 15, fontWeight: '500' },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  itemCard: { borderRadius: 12, padding: 16, borderLeftWidth: 6, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  itemName: { fontSize: 17, fontWeight: '700' },
  itemQty: { fontSize: 15, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  readOnlyInfo: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 5 },
  btnQty: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 22, fontWeight: 'bold' },
  qtyInput: { flex: 1, borderWidth: 1, borderRadius: 10, height: 48, textAlign: 'center', fontSize: 18, fontWeight: 'bold' },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rangeText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  summaryCard: { borderRadius: 12, padding: 16, borderWidth: 1, marginTop: 10 },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { fontWeight: 'bold', fontSize: 16 }
});