/**
 * CuisineScreen - O'PIED DU MONT Mobile
 * Écran de suivi des préparations en temps réel
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { supabase } from './supabase';

// --- GESTION DES COULEURS (Sécurisée) ---
let useColors = () => ({ 
  primary: '#EAB308', 
  surface: '#FFFFFF', 
  border: '#E2E8F0', 
  foreground: '#0F172A', 
  background: '#F8FAFC' 
});

try {
  const { useColors: hookColors } = require('./hooks/use-colors');
  useColors = hookColors;
} catch (e) {
  console.warn("Hook use-colors non trouvé, utilisation des couleurs par défaut.");
}

interface Preparation {
  id: number;
  table_numero: number | null;
  items: any[];
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
        .neq('statut', 'pret')
        .order('creee_a', { ascending: true });

      if (error) throw error;
      setPreparations(data || []);
    } catch (err) {
      console.error("Erreur cuisine:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, currentStatus: string) => {
    let nextStatus = 'en_cours';
    if (currentStatus === 'en_cours') nextStatus = 'pret';

    const { error } = await supabase
      .from('preparation_cuisine')
      .update({ statut: nextStatus })
      .eq('id', id);

    if (error) {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut");
    }
  };

  const renderItem = ({ item }: { item: Preparation }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.tableText, { color: colors.foreground }]}>
            {item.table_numero ? `TABLE ${item.table_numero}` : 'À EMPORTER'}
          </Text>
          <Text style={styles.timeText}>
            Reçu à {new Date(item.creee_a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        <View style={[styles.statusBadge, { 
          backgroundColor: item.statut === 'en_attente' ? '#fee2e2' : '#fef9c3' 
        }]}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.statut === 'en_attente' ? '#ef4444' : '#a16207' }}>
            {item.statut.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
        {item.items.map((prod: any, index: number) => (
          <View key={index} style={styles.itemRowContainer}>
            <Text style={styles.itemQty}>{prod.quantity}x</Text>
            <Text style={[styles.itemName, { color: colors.foreground }]}>{prod.name}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.actionBtn, { 
          backgroundColor: item.statut === 'en_attente' ? colors.primary : '#22c55e' 
        }]}
        onPress={() => updateStatus(item.id, item.statut)}
      >
        <Text style={styles.actionBtnText}>
          {item.statut === 'en_attente' ? 'COMMENCER LA PRÉPARATION' : 'MARQUER COMME PRÊT'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>CUISINE O'PIED DU MONT</Text>
        <Text style={styles.subtitle}>{preparations.length} commande(s) en préparation</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={preparations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Cuisine en ordre !</Text>
              <Text style={{ color: '#94a3b8' }}>Aucune nouvelle commande.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#64748b', marginTop: 4 },
  listContent: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  tableText: { fontSize: 20, fontWeight: '800' },
  timeText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  itemsList: { marginBottom: 20, borderTopWidth: 1, paddingTop: 15 },
  itemRowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemQty: { fontSize: 18, fontWeight: 'bold', color: '#EAB308', width: 40 },
  itemName: { fontSize: 18, fontWeight: '500' },
  actionBtn: { paddingVertical: 15, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#64748b' }
});