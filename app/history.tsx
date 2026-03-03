/**
 * HistoryScreen - O'PIED DU MONT
 * Emplacement : /app/history.tsx
 * Version : 2.1 - Correction Typage Date & Validation Paiement
 */

import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { useApp } from '../app-context';
import { supabase } from '../supabase';
import { formatPrice } from '../formatting';
import { useRouter } from 'expo-router';
import { refreshAppData } from '../services/data-service';

export default function HistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const isAdmin = state.user?.role === 'admin' || state.user?.role === 'manager';

  // Calcul du total cumulé des commandes affichées
  const totalCumule = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*, order_items(id)') 
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('created_by', state.user?.id);
    }

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query.limit(50);
    if (!error) setOrders(data || []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  // Action rapide : Marquer comme payé
  const handleMarkAsPaid = async (orderId: string, total: number) => {
    Alert.alert(
      "Confirmer l'encaissement",
      `Marquer la commande #${orderId.slice(-5)} comme PAYÉE (${formatPrice(total)}) ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Confirmer Paiement", 
          onPress: async () => {
            const { error } = await supabase
              .from('orders')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', orderId);

            if (error) {
              Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
            } else {
              fetchOrders();
              refreshAppData(dispatch);
            }
          }
        }
      ]
    );
  };

  const renderOrder = ({ item }: { item: any }) => {
    const itemCount = item.order_items?.length || 0;
    
    // Correction de l'erreur TypeScript sur les options de temps
    const formattedTime = new Date(item.created_at).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return (
      <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={[styles.orderId, { color: colors.foreground }]}># {item.id.toString().slice(-5)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              {formattedTime} • {itemCount} article{itemCount > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { 
            backgroundColor: item.status === 'paid' ? colors.success + '20' : colors.warning + '20' 
          }]}>
            <Text style={[styles.statusText, { 
              color: item.status === 'paid' ? colors.success : colors.warning 
            }]}>
              {item.status === 'paid' ? 'PAYÉ' : 'À ENCAISSER'}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={[styles.orderTotal, { color: colors.primary }]}>{formatPrice(item.total)}</Text>
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {item.status === 'pending' && (
              <TouchableOpacity 
                onPress={() => handleMarkAsPaid(item.id, item.total)}
                style={[styles.actionBtn, { backgroundColor: colors.success }]}
              >
                <Text style={styles.actionBtnText}>ENCAISSER</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={() => router.push({ pathname: "/order-details", params: { id: item.id } })}
              style={[styles.detailBtn, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.foreground }}>Détails</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>⬅️</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Historique</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{isAdmin ? "Toutes les ventes" : "Mes ventes du jour"}</Text>
        </View>
      </View>

      <View style={[styles.statsBanner, { backgroundColor: colors.primary }]}>
        <Text style={styles.statsLabel}>TOTAL {filter === 'paid' ? 'ENCAISSÉ' : 'SÉLECTIONNÉ'}</Text>
        <Text style={styles.statsValue}>{formatPrice(totalCumule)}</Text>
      </View>

      <View style={styles.filterBar}>
        {(['all', 'pending', 'paid'] as const).map((f) => (
          <TouchableOpacity 
            key={f} 
            onPress={() => setFilter(f)}
            style={[
              styles.filterBtn, 
              filter === f ? { backgroundColor: colors.foreground } : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.filterBtnText, { color: filter === f ? colors.background : colors.muted }]}>
              {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : 'Payées'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchOrders(); }} 
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
          ) : (
            <Text style={styles.empty}>Aucune commande enregistrée.</Text>
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 15 },
  backBtn: { padding: 5 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  statsBanner: { marginHorizontal: 25, padding: 20, borderRadius: 24, marginBottom: 20, elevation: 4 },
  statsLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statsValue: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  filterBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 25, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  filterBtnText: { fontSize: 12, fontWeight: '800' },
  list: { padding: 20, paddingBottom: 100 },
  orderCard: { padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 15, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  orderId: { fontWeight: '900', fontSize: 17 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(0,0,0,0.05)', 
    paddingTop: 15 
  },
  orderTotal: { fontSize: 22, fontWeight: '900' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  actionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  detailBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  empty: { textAlign: 'center', marginTop: 100, opacity: 0.4, fontWeight: '800' }
});