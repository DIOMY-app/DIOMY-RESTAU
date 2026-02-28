/**
 * Stock Management Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/stocks.tsx
 * Correction : Synchronisation totale avec le schéma SQL (nom, quantite, seuil_alerte)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';

// Interface alignée sur ton script SQL
interface StockItem {
  id: number; // SERIAL dans ton SQL
  nom: string;
  quantite: number;
  unite: string;
  seuil_alerte: number;
  categorie: string;
}

export default function StockScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Seuls admin, manager et chef peuvent modifier
  const userRole = state?.user?.role || '';
  const canEdit = ['admin', 'manager', 'chef'].includes(userRole.toLowerCase());

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('nom', { ascending: true });

      if (error) throw error;
      setStockItems(data || []);
    } catch (error: any) {
      Alert.alert("Erreur Base de données", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStock();
  };

  const handleUpdateQuantity = async (id: number, newQty: number) => {
    if (!canEdit) return;

    const finalQty = Math.max(0, newQty);
    const previousStock = [...stockItems];

    // Mise à jour optimiste
    setStockItems(current => 
      current.map(item => item.id === id ? { ...item, quantite: finalQty } : item)
    );

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantite: finalQty })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Erreur sync", "Impossible de mettre à jour le stock.");
      setStockItems(previousStock);
    }
  };

  const getStatus = (q: number, seuil: number) => {
    if (q <= 0) return { label: 'RUPTURE', color: '#ef4444' };
    if (q <= seuil) return { label: 'CRITIQUE', color: '#f59e0b' };
    return { label: 'DISPONIBLE', color: '#22c55e' };
  };

  const filteredItems = stockItems.filter(item =>
    (item.nom || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && stockItems.length === 0) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.muted }}>Accès à l'inventaire...</Text>
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
          <Text style={[styles.title, { color: colors.foreground }]}>Stocks</Text>
          <View style={[styles.roleBadge, { backgroundColor: canEdit ? colors.primary + '20' : colors.border }]}>
            <Text style={[styles.roleText, { color: canEdit ? colors.primary : colors.muted }]}>
              {canEdit ? "🛠️ GESTION" : "👁️ LECTURE"}
            </Text>
          </View>
        </View>

        <TextInput
          style={[styles.searchInput, {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.foreground,
          }]}
          placeholder="Chercher un ingrédient ou boisson..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.listContainer}>
          {filteredItems.map(item => {
            const status = getStatus(item.quantite, item.seuil_alerte);

            return (
              <View
                key={item.id}
                style={[styles.itemCard, {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: status.color,
                }]}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.flex1}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.nom}</Text>
                    <Text style={[styles.itemQty, { color: status.color }]}>
                      {item.quantite} {item.unite || 'unité(s)'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {canEdit ? (
                  <View style={styles.controlsRow}>
                    <TouchableOpacity
                      style={[styles.btnQty, { backgroundColor: colors.border }]}
                      onPress={() => handleUpdateQuantity(item.id, item.quantite - 1)}
                    >
                      <Text style={[styles.btnText, { color: colors.foreground }]}>−</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.qtyInput, {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.foreground,
                      }]}
                      value={item.quantite.toString()}
                      onChangeText={(text) => handleUpdateQuantity(item.id, parseFloat(text) || 0)}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      style={[styles.btnQty, { backgroundColor: colors.primary }]}
                      onPress={() => handleUpdateQuantity(item.id, item.quantite + 1)}
                    >
                      <Text style={[styles.btnText, { color: '#fff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.readOnlyInfo}>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      Seuil d'alerte configuré à : {item.seuil_alerte} {item.unite}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Alertes Stock</Text>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Produits sous le seuil :</Text>
            <Text style={[styles.bold, { color: '#ef4444' }]}>
              {stockItems.filter(i => i.quantite <= i.seuil_alerte).length}
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
  headerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  flex1: { flex: 1 },
  title: { fontSize: 32, fontWeight: '900' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roleText: { fontSize: 10, fontWeight: '800' },
  searchInput: { borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20 },
  listContainer: { gap: 12 },
  itemCard: { borderRadius: 18, padding: 16, borderLeftWidth: 6, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemName: { fontSize: 18, fontWeight: '800' },
  itemQty: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readOnlyInfo: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnQty: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 20, fontWeight: 'bold' },
  qtyInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, height: 45, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  summaryCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginTop: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bold: { fontWeight: '900', fontSize: 20 }
});