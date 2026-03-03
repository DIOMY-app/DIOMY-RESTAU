/**
 * CuisineScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/CuisineScreen.tsx
 * Version : 3.2 - Realtime Optimisé + Sync Badges Accueil
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

interface RecipeIngredient {
  stock_id: number;
  stock_name: string;
  quantity: number;
}

export default function CuisineScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [preparations, setPreparations] = useState<Preparation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'bons' | 'recettes'>('bons');

  // États pour la création de recette
  const [isRecipeModalVisible, setIsRecipeModalVisible] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [qtyToConsume, setQtyToConsume] = useState('');
  const [tempIngredients, setTempIngredients] = useState<RecipeIngredient[]>([]);

  const isAdmin = state?.user?.role?.toLowerCase() === 'admin';
  const availableStock = state.stockItems || []; 

  useEffect(() => {
    fetchPreparations();

    // Optimisation Realtime : On écoute les changements
    const channel = supabase
      .channel('cuisine_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'preparation_cuisine' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPreparations(prev => [...prev, payload.new as Preparation].sort((a, b) => 
              new Date(a.creee_a).getTime() - new Date(b.creee_a).getTime()
            ));
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Preparation;
            if (updated.statut === 'pret') {
              setPreparations(prev => prev.filter(p => p.id !== updated.id));
            } else {
              setPreparations(prev => prev.map(p => p.id === updated.id ? updated : p));
            }
          } else {
            fetchPreparations();
          }
        }
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

  /**
   * LOGIQUE DE DÉDUCTION DE STOCK
   */
  const deductStockFromItems = async (items: any[]) => {
    try {
      for (const item of items) {
        const menuItemId = item.id || item.menu_item_id;
        const quantitySold = item.quantite || item.quantity || 1;

        const { data: recipeLines, error: recipeError } = await supabase
          .from('recipes')
          .select('stock_id, quantite_consommee')
          .eq('menu_item_id', menuItemId);

        if (recipeError) throw recipeError;

        if (recipeLines && recipeLines.length > 0) {
          for (const line of recipeLines) {
            const totalToDeduct = line.quantite_consommee * quantitySold;
            
            // Correction : Utilisation d'une transaction via RPC si possible, 
            // sinon on récupère la valeur la plus fraîche
            const { data: currentStock } = await supabase
              .from('stock')
              .select('quantite')
              .eq('id', line.stock_id)
              .single();

            if (currentStock) {
              await supabase
                .from('stock')
                .update({ quantite: currentStock.quantite - totalToDeduct })
                .eq('id', line.stock_id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Erreur déduction stock:", err);
    }
  };

  const updateStatus = async (prep: Preparation) => {
    let nextStatus: 'en_cours' | 'pret' = prep.statut === 'en_attente' ? 'en_cours' : 'pret';

    try {
      const { error } = await supabase
        .from('preparation_cuisine')
        .update({ statut: nextStatus })
        .eq('id', prep.id);

      if (error) throw error;

      if (nextStatus === 'pret') {
        const itemsList = Array.isArray(prep.items) ? prep.items : [];
        await deductStockFromItems(itemsList);
      }

    } catch (err: any) {
      Alert.alert("Erreur", "Action impossible : " + err.message);
    }
  };

  // --- LOGIQUE DES RECETTES ---
  const addIngredientToTempList = () => {
    if (!selectedStockId || !qtyToConsume) {
      Alert.alert("Incomplet", "Entrez l'ID ingrédient et la quantité.");
      return;
    }

    const stockItem = availableStock.find((s: any) => s.id.toString() === selectedStockId);
    const displayName = stockItem ? (stockItem.nom || stockItem.name) : `ID #${selectedStockId}`;

    const newIngredient: RecipeIngredient = {
      stock_id: parseInt(selectedStockId),
      stock_name: displayName,
      quantity: parseFloat(qtyToConsume.replace(',', '.'))
    };

    setTempIngredients([...tempIngredients, newIngredient]);
    setSelectedStockId('');
    setQtyToConsume('');
  };

  const handleSaveRecipe = async () => {
    if (!selectedMenuId || tempIngredients.length === 0) {
      Alert.alert("Erreur", "Sélectionnez un plat et ses ingrédients.");
      return;
    }

    setIsSubmitting(true);
    try {
      const recipeData = tempIngredients.map(ing => ({
        menu_item_id: parseInt(selectedMenuId),
        stock_id: ing.stock_id,
        quantite_consommee: ing.quantity
      }));

      await supabase.from('recipes').delete().eq('menu_item_id', parseInt(selectedMenuId));
      const { error } = await supabase.from('recipes').insert(recipeData);

      if (error) throw error;

      Alert.alert("Succès ✨", "Fiche technique mise à jour.");
      setIsRecipeModalVisible(false);
      setTempIngredients([]);
      setSelectedMenuId('');
    } catch (err: any) {
      Alert.alert("Erreur SQL", err.message);
    } finally {
      setIsSubmitting(false);
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
            <Text style={[styles.timeText, { color: colors.muted }]}>
              🕒 Reçu à {new Date(item.creee_a).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isEnAttente ? '#fee2e2' : '#fef9c3' }]}>
            <Text style={{ fontSize: 10, fontWeight: '900', color: isEnAttente ? '#b91c1c' : '#a16207' }}>
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
            {isEnAttente ? 'LANCER LA PRÉPARATION' : 'PRÊT POUR SERVICE ✅'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>INTERFACE CUISINE</Text>
        <View style={styles.tabsContainer}>
          <TouchableOpacity onPress={() => setActiveTab('bons')} style={[styles.tab, activeTab === 'bons' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabText, { color: activeTab === 'bons' ? colors.primary : colors.muted }]}>COMMANDES</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={() => setActiveTab('recettes')} style={[styles.tab, activeTab === 'recettes' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
              <Text style={[styles.tabText, { color: activeTab === 'recettes' ? colors.primary : colors.muted }]}>FICHES TECHNIQUES</Text>
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
                <Text style={[styles.emptyText, { color: colors.muted }]}>Aucun bon en attente. Repos ! 🌴</Text>
              </View>
            }
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.recipeContainer}>
          <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Automatisation Stocks</Text>
            <Text style={{ color: colors.muted, marginBottom: 20, fontSize: 13 }}>
              En configurant une recette, le stock sera déduit dès qu'un plat est marqué comme "Prêt".
            </Text>
            <TouchableOpacity style={[styles.addRecipeBtn, { backgroundColor: colors.primary }]} onPress={() => setIsRecipeModalVisible(true)}>
              <Text style={styles.addRecipeBtnText}>+ CONFIGURER UNE RECETTE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Modal Recette identique */}
      <Modal visible={isRecipeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvelle Recette</Text>
              
              <Text style={styles.label}>ID du Plat au Menu</Text>
              <TextInput 
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Ex: 101"
                value={selectedMenuId}
                onChangeText={setSelectedMenuId}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Ajouter des ingrédients</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput 
                  style={[styles.input, { flex: 2, borderColor: colors.border, color: colors.foreground }]} 
                  placeholder="ID Stock"
                  value={selectedStockId}
                  onChangeText={setSelectedStockId}
                  keyboardType="numeric"
                />
                <TextInput 
                  style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]} 
                  placeholder="Qté"
                  value={qtyToConsume}
                  onChangeText={setQtyToConsume}
                  keyboardType="numeric"
                />
                <TouchableOpacity onPress={addIngredientToTempList} style={[styles.plusBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tempList}>
                {tempIngredients.map((item, index) => (
                  <View key={index} style={[styles.tempItem, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={{ flex: 1, color: colors.foreground, fontWeight: '600' }}>{item.stock_name}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '800', marginRight: 15 }}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => setTempIngredients(tempIngredients.filter((_, i) => i !== index))}>
                      <Text style={{ color: '#ef4444' }}>✖</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setIsRecipeModalVisible(false)} style={styles.cancelBtn}>
                  <Text style={{ color: colors.muted }}>FERMER</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  disabled={isSubmitting || tempIngredients.length === 0}
                  onPress={handleSaveRecipe}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: tempIngredients.length === 0 ? 0.5 : 1 }]}
                >
                  <Text style={{ color: 'white', fontWeight: '900' }}>VALIDER LA FICHE</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 10, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 15, letterSpacing: 1 },
  tabsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 30 },
  tab: { paddingVertical: 12 },
  tabText: { fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  listContent: { padding: 16 },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 20, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  tableText: { fontSize: 22, fontWeight: '900' },
  timeText: { fontSize: 12, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  itemsList: { marginBottom: 20, borderTopWidth: 1, paddingTop: 15 },
  itemRowContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  qtyCircle: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  qtyText: { color: 'white', fontWeight: '900', fontSize: 15 },
  itemName: { fontSize: 17, fontWeight: '700' },
  actionBtn: { paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, fontWeight: '700' },
  recipeContainer: { padding: 20 },
  infoBox: { padding: 25, borderRadius: 24 },
  infoTitle: { fontSize: 18, fontWeight: '900', marginBottom: 8 },
  addRecipeBtn: { padding: 16, borderRadius: 15, alignItems: 'center' },
  addRecipeBtnText: { color: 'white', fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 30, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 8, marginTop: 15, textTransform: 'uppercase' },
  input: { borderWidth: 2, borderRadius: 15, padding: 15, fontSize: 16, fontWeight: '600' },
  plusBtn: { width: 55, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  tempList: { marginTop: 20, gap: 10 },
  tempItem: { flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35 },
  cancelBtn: { padding: 10 },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15 }
});