/**
 * CuisineScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/CuisineScreen.tsx
 * Écran de suivi de production en temps réel (Flux épuré)
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, SafeAreaView 
} from 'react-native';
import { supabase } from '../supabase';
import { useColors } from '../hooks/use-colors';

// Interfaces pour le typage strict
interface ItemPreparation {
  name: string;
  quantity: number;
}

interface Preparation {
  id: number;
  table_numero: number | null;
  items: ItemPreparation[];
  statut: 'en_attente' | 'en_cours' | 'pret';
  creee_a: string;
}

export default function CuisineScreen() {
  const colors = useColors();
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [loading, setLoading] = useState(true);

  // --- CHARGEMENT INITIAL & REALTIME ---
  useEffect(() => {
    fetchPreparations();

    // Inscription aux changements pour mettre à jour l'affichage instantanément
    const channel = supabase
      .channel('cuisine_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'preparation_cuisine' }, 
        () => fetchPreparations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPreparations = async () => {
    try {
      const { data, error } = await supabase
        .from('preparation_cuisine')
        .select('*')
        .neq('statut', 'pret') // On masque ce qui est déjà servi
        .order('creee_a', { ascending: true }); // FIFO : Premier arrivé, premier servi

      if (error) throw error;
      setPreparations(data || []);
    } catch (err: any) {
      console.error("Erreur chargement cuisine:", err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Met à jour uniquement le statut de la préparation.
   * Note : Le déstockage est géré par data-service au moment de la transaction.
   */
  const updateStatus = async (prep: Preparation) => {
    let nextStatus: 'en_cours' | 'pret' = 'en_cours';
    if (prep.statut === 'en_cours') nextStatus = 'pret';

    const { error } = await supabase
      .from('preparation_cuisine')
      .update({ statut: nextStatus })
      .eq('id', prep.id);

    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut en cuisine.");
    }
    // Le rafraîchissement est géré automatiquement par le channel Realtime
  };

  const renderItem = ({ item }: { item: Preparation }) => {
    const isEnAttente = item.statut === 'en_attente';

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.tableText, { color: colors.foreground }]}>
              {item.table_numero ? `TABLE ${item.table_numero}` : '🛍️ À EMPORTER'}
            </Text>
            <Text style={styles.timeText}>
              Reçu à {new Date(item.creee_a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { 
            backgroundColor: isEnAttente ? '#fee2e2' : '#fef9c3' 
          }]}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: isEnAttente ? '#ef4444' : '#a16207' }}>
              {item.statut.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
          {item.items.map((prod, index) => (
            <View key={index} style={styles.itemRowContainer}>
              <View style={[styles.qtyCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.qtyText}>{prod.quantity}</Text>
              </View>
              <Text style={[styles.itemName, { color: colors.foreground }]}>{prod.name}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, { 
            backgroundColor: isEnAttente ? colors.primary : '#22c55e' 
          }]}
          onPress={() => updateStatus(item)}
        >
          <Text style={styles.actionBtnText}>
            {isEnAttente ? 'COMMENCER LA PRÉPARATION' : 'MARQUER COMME PRÊT'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>👨‍🍳 CUISINE</Text>
        <Text style={styles.subtitle}>{preparations.length} ticket(s) actif(s)</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={preparations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Cuisine en ordre ! ✨</Text>
              <Text style={{ color: colors.muted, marginTop: 8 }}>Aucune commande à préparer actuellement.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#64748b', marginTop: 4, fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, gap: 16 },
  card: { 
    borderRadius: 24, 
    borderWidth: 1.5, 
    padding: 20, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 6 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  tableText: { fontSize: 24, fontWeight: '900' },
  timeText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  itemsList: { marginBottom: 20, borderTopWidth: 1, paddingTop: 15 },
  itemRowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  qtyCircle: { 
    width: 38, 
    height: 38, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  qtyText: { color: 'white', fontWeight: '900', fontSize: 18 },
  itemName: { fontSize: 19, fontWeight: '700' },
  actionBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' }
});