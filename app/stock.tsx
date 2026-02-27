/**
 * Stock Management Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/stocks.tsx
 * Gestion des permissions : Édition pour Admin/Manager/Chef, Lecture seule pour Staff.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';

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
  const [refreshing, setRefreshing] = useState(false);

  // Vérification du rôle : Seuls admin, manager et chef peuvent modifier
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
      Alert.alert("Erreur", "Impossible de charger le stock : " + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStock();
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (!canEdit) return;

    const finalQty = Math.max(0, newQuantity);
    
    // Sauvegarde de l'ancien état pour rollback en cas d'erreur
    const previousStock = [...stockItems];

    // Mise à jour optimiste de l'UI
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
      Alert.alert("Erreur sync", "Échec de la mise à jour sur le serveur.");
      setStockItems(previousStock); // Rollback
    }
  };

  const getStockStatus = (q: number, min: number, max: number) => {
    if (q <= min) return 'low';
    if (q >= max) return 'high';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    if (status === 'low') return '#ef4444'; // Rouge
    if (status === 'high') return '#22c55e'; // Vert
    return colors.primary; // Orange/Thème
  };

  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && stockItems.length === 0) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.muted }}>Chargement de l'inventaire...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        contentContainerStyle={styles.scrollPadding} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>Inventaire</Text>
          <View style={[styles.roleBadge, { backgroundColor: canEdit ? colors.primary + '20' : colors.border }]}>
            <Text style={[styles.roleText, { color: canEdit ? colors.primary : colors.muted }]}>
              {canEdit ? "🛠️ MODE GESTION" : "👁️ LECTURE SEULE"}
            </Text>
          </View>
        </View>

        <TextInput
          style={[styles.searchInput, {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.foreground,
          }]}
          placeholder="Rechercher un produit (boisson, riz...)"
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.listContainer}>
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
                    <Text style={[styles.itemQty, { color: statusColor }]}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {status === 'low' ? 'CRITIQUE' : status === 'high' ? 'DISPONIBLE' : 'STABLE'}
                    </Text>
                  </View>
                </View>

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
                      selectTextOnFocus
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
                    <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic' }}>
                      Contactez un manager pour modifier le stock.
                    </Text>
                  </View>
                )}

                <View style={styles.rangeRow}>
                  <Text style={styles.rangeText}>Alerte sous: {item.min_quantity} {item.unit}</Text>
                  <Text style={styles.rangeText}>Cible: {item.max_quantity} {item.unit}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Résumé des alertes */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Récapitulatif des alertes</Text>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Articles en rupture ou faibles :</Text>
            <Text style={[styles.bold, { color: '#ef4444' }]}>
              {stockItems.filter(i => i.quantity <= i.min_quantity).length}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollPadding: { padding: 20, paddingBottom: 40 },
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  flex1: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 10, fontWeight: '800' },
  searchInput: { borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 20 },
  listContainer: { gap: 16 },
  itemCard: { borderRadius: 18, padding: 18, borderLeftWidth: 6, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  itemName: { fontSize: 18, fontWeight: '800' },
  itemQty: { fontSize: 16, marginTop: 4, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  readOnlyInfo: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 5 },
  btnQty: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 24, fontWeight: 'bold' },
  qtyInput: { flex: 1, borderWidth: 1.5, borderRadius: 14, height: 50, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
  rangeText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  summaryCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginTop: 25 },
  summaryTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bold: { fontWeight: '900', fontSize: 20 }
});