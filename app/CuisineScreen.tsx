/**
 * CuisineScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/CuisineScreen.tsx
 * Version Finale : Production + Gestion des Recettes Admin
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, SafeAreaView, ScrollView, Modal, TextInput
} from 'react-native';
import { supabase } from '../supabase';
import { useColors } from '../hooks/use-colors';
import { useApp } from '../app-context';

interface Preparation {
  id: number;
  table_numero: number | null;
  items: any;
  statut: 'en_attente' | 'en_cours' | 'pret';
  creee_a: string;
}

export default function CuisineScreen() {
  const colors = useColors();
  const { state } = useApp();
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bons' | 'recettes'>('bons');

  // État pour la création de recette (Admin)
  const [isRecipeModalVisible, setIsRecipeModalVisible] = useState(false);
  const isAdmin = state?.user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    fetchPreparations();

    const channel = supabase
      .channel('cuisine_realtime')
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
    } catch (err: any) {
      console.error("Erreur cuisine:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (prep: Preparation) => {
    let nextStatus: 'en_cours' | 'pret' = 'en_cours';
    if (prep.statut === 'en_cours') nextStatus = 'pret';

    try {
      const { error } = await supabase
        .from('preparation_cuisine')
        .update({ statut: nextStatus })
        .eq('id', prep.id);

      if (error) throw error;
    } catch (err: any) {
      Alert.alert("Erreur", "Impossible de mettre à jour la commande.");
    }
  };

  const renderBon = ({ item }: { item: Preparation }) => {
    const isEnAttente = item.statut === 'en_attente';
    const itemsList = Array.isArray(item.items) ? item.items : [];

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.tableText, { color: colors.foreground }]}>
              {item.table_numero ? `TABLE ${item.table_numero}` : '🛍️ À EMPORTER'}
            </Text>
            <Text style={styles.timeText}>
              🕒 Reçu à {new Date(item.creee_a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: isEnAttente ? colors.error + '20' : '#fef9c3' }]}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: isEnAttente ? colors.error : '#a16207' }}>
              {item.statut.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={[styles.itemsList, { borderTopColor: colors.border }]}>
          {itemsList.map((prod: any, index: number) => (
            <View key={index} style={styles.itemRowContainer}>
              <View style={[styles.qtyCircle, { backgroundColor: colors.primary }]}>
                <Text style={styles.qtyText}>{prod.quantite || prod.quantity || 1}</Text>
              </View>
              <Text style={[styles.itemName, { color: colors.foreground }]}>
                {prod.nom || prod.name}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: isEnAttente ? colors.primary : '#22c55e' }]}
          onPress={() => updateStatus(item)}
        >
          <Text style={styles.actionBtnText}>
            {isEnAttente ? 'LANCER LA PRÉPARATION' : 'MARQUER COMME PRÊT'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER AVEC ONGLETS */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>CUISINE & RECETTES</Text>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('bons')}
            style={[styles.tab, activeTab === 'bons' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'bons' ? colors.primary : colors.muted }]}>BONS EN COURS</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity 
              onPress={() => setActiveTab('recettes')}
              style={[styles.tab, activeTab === 'recettes' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
            >
              <Text style={[styles.tabText, { color: activeTab === 'recettes' ? colors.primary : colors.muted }]}>RECETTES (ADMIN)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {activeTab === 'bons' ? (
        loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            data={preparations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBon}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.foreground }]}>Cuisine à jour ! ✨</Text>
                <Text style={{ color: colors.muted, textAlign: 'center' }}>Aucun bon en attente.</Text>
              </View>
            }
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.recipeContainer}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Liaison Stock Automatique</Text>
            <Text style={{ color: colors.muted, marginBottom: 15 }}>
              Configurez ici quels ingrédients sont consommés pour chaque plat vendu.
            </Text>
            <TouchableOpacity 
              style={[styles.addRecipeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsRecipeModalVisible(true)}
            >
              <Text style={styles.addRecipeBtnText}>+ CRÉER UNE RECETTE</Text>
            </TouchableOpacity>
          </View>
          
          {/* Liste fictive des recettes existantes (à lier à ta table recipes) */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recettes Actives</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic' }}>
            Aucune recette configurée. Les ventes déduisent actuellement les produits finis uniquement.
          </Text>
        </ScrollView>
      )}

      {/* MODAL CONFIGURATION RECETTE */}
      <Modal visible={isRecipeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvelle Recette</Text>
            
            <Text style={styles.label}>Plat du Menu</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} 
              placeholder="Ex: Poulet Braisé"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Ingrédient du Stock</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} 
              placeholder="Ex: Poulet Entier"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.label}>Quantité consommée</Text>
            <TextInput 
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} 
              placeholder="Ex: 1"
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsRecipeModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>ANNULER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: 'white', fontWeight: '900' }}>ENREGISTRER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 20, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  tabsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
  tab: { paddingVertical: 10 },
  tabText: { fontWeight: '800', fontSize: 13 },
  listContent: { padding: 16, gap: 20 },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 20, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  tableText: { fontSize: 24, fontWeight: '900' },
  timeText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  itemsList: { marginBottom: 20, borderTopWidth: 1, paddingTop: 15 },
  itemRowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  qtyCircle: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  qtyText: { color: 'white', fontWeight: '900', fontSize: 16 },
  itemName: { fontSize: 18, fontWeight: '700' },
  actionBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 22, fontWeight: 'bold' },
  recipeContainer: { padding: 20 },
  infoBox: { padding: 20, borderRadius: 20, marginBottom: 20 },
  infoTitle: { fontSize: 18, fontWeight: '800', marginBottom: 5 },
  addRecipeBtn: { padding: 15, borderRadius: 12, alignItems: 'center' },
  addRecipeBtnText: { color: 'white', fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 10, marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 28, padding: 25 },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '900', color: '#64748b', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 30 },
  cancelBtn: { padding: 10 },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 }
});