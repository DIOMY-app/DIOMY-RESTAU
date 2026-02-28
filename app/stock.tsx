/**
 * Stock Management Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/stocks.tsx
 * Amélioration : Alertes critiques visuelles et filtres rapides
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, ActivityIndicator, Alert, RefreshControl 
} from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';
import { refreshAppData } from '../services/data-service';
import { StockItem } from '../types';

export default function StockScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false); // Nouveau filtre
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userRole = state?.user?.role || '';
  const canEdit = ['admin', 'manager', 'chef'].includes(userRole.toLowerCase());
  const stockItems = state.stockItems || [];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await refreshAppData(dispatch);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAppData(dispatch);
    setRefreshing(false);
  };

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (!canEdit) return;
    const finalQty = Math.max(0, newQty);
    
    // Mise à jour optimiste
    const updatedStocks = stockItems.map(item => 
      item.id === id ? { ...item, quantity: finalQty } : item
    );

    dispatch({
      type: 'SET_DATA',
      payload: { stockItems: updatedStocks }
    });

    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantite: finalQty })
        .eq('id', parseInt(id));

      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Erreur sync", "Impossible de mettre à jour le stock en ligne.");
      refreshAppData(dispatch);
    }
  };

  const getStatus = (q: number, seuil: number) => {
    if (q <= 0) return { label: 'RUPTURE', color: '#ef4444', level: 2 };
    if (q <= seuil) return { label: 'CRITIQUE', color: '#f59e0b', level: 1 };
    return { label: 'DISPONIBLE', color: '#22c55e', level: 0 };
  };

  // Logique de filtrage combinée
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isAlert = item.quantity <= item.minQuantity;
    return showOnlyAlerts ? (matchesSearch && isAlert) : matchesSearch;
  });

  const alertCount = stockItems.filter(i => i.quantity <= i.minQuantity).length;

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
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Stocks</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Suivi des ingrédients à Korhogo</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: canEdit ? colors.primary + '20' : colors.border }]}>
            <Text style={[styles.roleText, { color: canEdit ? colors.primary : colors.muted }]}>
              {canEdit ? "🛠️ GESTION" : "👁️ LECTURE"}
            </Text>
          </View>
        </View>

        {/* BANDEAU D'ALERTE DYNAMIQUE */}
        {alertCount > 0 && (
          <TouchableOpacity 
            onPress={() => setShowOnlyAlerts(!showOnlyAlerts)}
            style={[styles.alertBanner, { backgroundColor: showOnlyAlerts ? '#ef4444' : '#fef2f2', borderColor: '#fee2e2' }]}
          >
            <Text style={[styles.alertBannerText, { color: showOnlyAlerts ? '#fff' : '#ef4444' }]}>
              ⚠️ {alertCount} produit{alertCount > 1 ? 's sont' : ' est'} en seuil critique !
            </Text>
            <Text style={[styles.alertBannerSub, { color: showOnlyAlerts ? '#fff' : '#ef4444' }]}>
              {showOnlyAlerts ? "Voir tout le stock" : "Filtrer les alertes"}
            </Text>
          </TouchableOpacity>
        )}

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
            const status = getStatus(item.quantity, item.minQuantity);

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
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={styles.qtyRow}>
                      <Text style={[styles.itemQty, { color: status.color }]}>
                        {item.quantity} {item.unit || 'unité(s)'}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>
                        (Seuil: {item.minQuantity})
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {canEdit && (
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
                      onChangeText={(text) => handleUpdateQuantity(item.id, parseFloat(text) || 0)}
                      keyboardType="numeric"
                    />

                    <TouchableOpacity
                      style={[styles.btnQty, { backgroundColor: colors.primary }]}
                      onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Text style={[styles.btnText, { color: '#fff' }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ color: colors.muted }}>Aucun produit trouvé.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  alertBanner: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertBannerText: { fontWeight: '800', fontSize: 14 },
  alertBannerSub: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  searchInput: { borderWidth: 1.5, borderRadius: 15, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 20 },
  listContainer: { gap: 12 },
  itemCard: { borderRadius: 18, padding: 16, borderLeftWidth: 6, borderWidth: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemName: { fontSize: 18, fontWeight: '800' },
  qtyRow: { flexDirection: 'row', alignItems: 'baseline' },
  itemQty: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 10, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnQty: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 20, fontWeight: 'bold' },
  qtyInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, height: 45, textAlign: 'center', fontSize: 18, fontWeight: '800' },
  emptyState: { padding: 40, alignItems: 'center' }
});