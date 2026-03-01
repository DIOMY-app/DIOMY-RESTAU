/**
 * Stock Management Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/stocks.tsx
 * Version : Inventaire Dimanche + Déclaration Pertes + Recettes
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, FlatList 
} from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';
import { useApp } from '../app-context';
import { refreshAppData } from '../services/data-service';
import { StockItem } from '../types';

type RecipeLink = {
  id: number;
  stock_id: number;
  quantite_consommee: number;
  stock_name?: string;
};

export default function StockScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  // États généraux
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMode, setActiveMode] = useState<'inventaire' | 'recettes'>('inventaire');

  // États Inventaire & Pertes
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isLossModalVisible, setIsLossModalVisible] = useState(false);
  const [selectedItemForLoss, setSelectedItemForLoss] = useState<StockItem | null>(null);
  const [lossQty, setLossQty] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: '0', minQuantity: '5', unit: 'pcs' });

  // États Recettes
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeLink[]>([]);
  const [isRecipeModalVisible, setIsRecipeModalVisible] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [qtyToConsume, setQtyToConsume] = useState('');

  const userRole = state?.user?.role || '';
  const isAdmin = userRole.toLowerCase() === 'admin';
  const canEdit = ['admin', 'manager', 'chef'].includes(userRole.toLowerCase());
  const stockItems = state.stockItems || [];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMenuItem && activeMode === 'recettes') {
      loadRecipe(selectedMenuItem.id);
    }
  }, [selectedMenuItem, activeMode]);

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

  // --- LOGIQUE INVENTAIRE & PERTES ---

  const handleCreateItem = async () => {
    if (!newItem.name) return Alert.alert("Erreur", "Le nom est obligatoire");
    setLoading(true);
    try {
      const { error } = await supabase
        .from('stock')
        .insert([{
          nom: newItem.name,
          quantite: parseFloat(newItem.quantity),
          seuil_alerte: parseFloat(newItem.minQuantity),
          unite: newItem.unit
        }]);
      if (error) throw error;
      setIsAddModalVisible(false);
      setNewItem({ name: '', quantity: '0', minQuantity: '5', unit: 'pcs' });
      await refreshAppData(dispatch);
      Alert.alert("Succès", "Article ajouté au stock.");
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: string, newQty: number) => {
    if (!canEdit) return;
    const finalQty = Math.max(0, newQty);
    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantite: finalQty })
        .eq('id', parseInt(id));
      if (error) throw error;
      await refreshAppData(dispatch);
    } catch (error: any) {
      Alert.alert("Erreur sync", error.message);
    }
  };

  const handleDeclareLoss = async () => {
    if (!selectedItemForLoss || !lossQty) return;
    const qtyToSubtract = parseFloat(lossQty.replace(',', '.'));
    const finalQty = Math.max(0, selectedItemForLoss.quantity - qtyToSubtract);

    try {
      setLoading(true);
      // 1. Mettre à jour le stock
      const { error } = await supabase
        .from('stock')
        .update({ quantite: finalQty })
        .eq('id', parseInt(selectedItemForLoss.id));
      
      if (error) throw error;

      // 2. Optionnel: Log de la perte dans une table 'stock_logs' si elle existe
      // await supabase.from('stock_logs').insert([{ item_id: selectedItemForLoss.id, type: 'perte', quantite: qtyToSubtract }]);

      setIsLossModalVisible(false);
      setLossQty('');
      await refreshAppData(dispatch);
      Alert.alert("Perte enregistrée", `${qtyToSubtract} ${selectedItemForLoss.unit} déduits.`);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFullInventory = () => {
    Alert.alert(
      "Inventaire Complet",
      "Voulez-vous lancer la procédure de mise à jour manuelle pour tous les articles ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Lancer", onPress: () => Alert.alert("Info", "Modifiez simplement les chiffres dans la liste, la sauvegarde est automatique.") }
      ]
    );
  };

  // --- LOGIQUE RECETTES ---

  const loadRecipe = async (menuId: string) => {
    const { data, error } = await supabase
      .from('menu_recettes')
      .select(`id, stock_id, quantite_consommee, stock:stock_id (nom)`)
      .eq('menu_id', parseInt(menuId));

    if (!error && data) {
      setRecipeItems(data.map((d: any) => ({
        id: d.id,
        stock_id: d.stock_id,
        quantite_consommee: d.quantite_consommee,
        stock_name: d.stock?.nom || 'Inconnu'
      })));
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedStockId || !qtyToConsume) return;
    const { error } = await supabase.from('menu_recettes').insert([{
      menu_id: parseInt(selectedMenuItem.id),
      stock_id: parseInt(selectedStockId),
      quantite_consommee: parseFloat(qtyToConsume.replace(',', '.'))
    }]);
    if (!error) {
      setIsRecipeModalVisible(false);
      setQtyToConsume('');
      loadRecipe(selectedMenuItem.id);
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    const { error } = await supabase.from('menu_recettes').delete().eq('id', id);
    if (!error) loadRecipe(selectedMenuItem.id);
  };

  const getStatus = (q: number, seuil: number) => {
    if (q <= 0) return { label: 'RUPTURE', color: '#ef4444', bg: '#fef2f2' };
    if (q <= seuil) return { label: 'CRITIQUE', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'OK', color: '#22c55e', bg: 'transparent' };
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const isAlert = item.quantity <= item.minQuantity;
    return showOnlyAlerts ? (matchesSearch && isAlert) : matchesSearch;
  });

  const alertCount = stockItems.filter(i => i.quantity <= i.minQuantity).length;

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Stocks</Text>
          {isAdmin && activeMode === 'inventaire' && (
            <View style={{flexDirection: 'row', gap: 8}}>
               <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.border }]} 
                onPress={handleFullInventory}
              >
                <Text style={[styles.addButtonText, {color: colors.foreground}]}>📋 INVENTAIRE</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.primary }]} 
                onPress={() => setIsAddModalVisible(true)}
              >
                <Text style={styles.addButtonText}>+ ARRIVAGE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => setActiveMode('inventaire')} style={[styles.tab, activeMode === 'inventaire' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabText, { color: activeMode === 'inventaire' ? colors.primary : colors.muted }]}>Inventaire</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveMode('recettes')} style={[styles.tab, activeMode === 'recettes' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}>
            <Text style={[styles.tabText, { color: activeMode === 'recettes' ? colors.primary : colors.muted }]}>Recettes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeMode === 'inventaire' ? (
        <ScrollView 
          contentContainerStyle={styles.scrollPadding} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {alertCount > 0 && (
            <TouchableOpacity 
              onPress={() => setShowOnlyAlerts(!showOnlyAlerts)} 
              style={[styles.alertBanner, { backgroundColor: showOnlyAlerts ? '#ef4444' : '#fef2f2' }]}
            >
              <Text style={{ color: showOnlyAlerts ? '#fff' : '#ef4444', fontWeight: '900', textAlign: 'center' }}>
                ⚠️ {alertCount} ARTICLES EN SEUIL CRITIQUE ! {showOnlyAlerts ? "(Voir tout)" : "(Filtrer)"}
              </Text>
            </TouchableOpacity>
          )}

          <TextInput 
            style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]} 
            placeholder="Rechercher un ingrédient..." 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />

          <View style={styles.listContainer}>
            {filteredItems.map(item => {
              const status = getStatus(item.quantity, item.minQuantity);
              return (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: status.color }]}>
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{item.unit} • Seuil d'alerte: {item.minQuantity}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: status.color, fontWeight: '900', fontSize: 22 }}>{item.quantity}</Text>
                      <Text style={{ color: status.color, fontSize: 10, fontWeight: 'bold' }}>{status.label}</Text>
                    </View>
                  </View>
                  
                  {canEdit && (
                    <View style={styles.controlsRow}>
                      <TouchableOpacity 
                        style={[styles.btnQty, { backgroundColor: colors.border }]} 
                        onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      >
                        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>-</Text>
                      </TouchableOpacity>
                      <TextInput 
                        style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border }]} 
                        keyboardType="numeric" 
                        value={item.quantity.toString()} 
                        onChangeText={(v) => handleUpdateQuantity(item.id, parseFloat(v) || 0)} 
                      />
                      <TouchableOpacity 
                        style={[styles.btnQty, { backgroundColor: colors.primary }]} 
                        onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      >
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                      
                      {/* BOUTON PERTE */}
                      <TouchableOpacity 
                        style={[styles.btnLoss, { borderColor: '#ef4444' }]} 
                        onPress={() => {
                            setSelectedItemForLoss(item);
                            setIsLossModalVisible(true);
                        }}
                      >
                        <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: 'bold' }}>PERTE</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.recetteContainer}>
          <Text style={[styles.sectionLabel, { marginBottom: 15 }]}>Lien auto Plats ↔ Ingrédients</Text>
          <View style={styles.recetteSplit}>
            <View style={{ flex: 1 }}>
              <FlatList
                data={state.menuItems}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.menuItemMini, { backgroundColor: colors.surface, borderColor: selectedMenuItem?.id === item.id ? colors.primary : colors.border }]}
                    onPress={() => setSelectedMenuItem(item)}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 12 }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <View style={[styles.recetteDetail, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {selectedMenuItem ? (
                <>
                  <Text style={{ color: colors.foreground, fontWeight: '800', marginBottom: 10 }}>{selectedMenuItem.name}</Text>
                  {recipeItems.length > 0 ? recipeItems.map(ri => (
                    <View key={ri.id} style={styles.recipeRow}>
                      <Text style={{ flex: 1, fontSize: 12, color: colors.foreground }}>{ri.stock_name}</Text>
                      <Text style={{ fontWeight: 'bold', color: colors.primary }}>{ri.quantite_consommee}</Text>
                      <TouchableOpacity onPress={() => handleDeleteIngredient(ri.id)}>
                        <Text style={{ color: '#ef4444', marginLeft: 10, fontWeight: 'bold' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )) : (
                    <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic', marginVertical: 10 }}>Aucun ingrédient lié.</Text>
                  )}
                  <TouchableOpacity style={[styles.miniAddBtn, { backgroundColor: colors.primary }]} onPress={() => setIsRecipeModalVisible(true)}>
                    <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>+ LIER</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.centerContent}>
                  <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 12 }}>Sélectionnez un plat</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* MODAL AJOUT ARTICLE */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvel Arrivage</Text>
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder="Nom (ex: Sac de Riz)" value={newItem.name} onChangeText={(v) => setNewItem({...newItem, name: v})} />
            <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
              <TextInput style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]} placeholder="Qté initiale" keyboardType="numeric" value={newItem.quantity} onChangeText={(v) => setNewItem({...newItem, quantity: v})} />
              <TextInput style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border }]} placeholder="Unité (kg, l)" value={newItem.unit} onChangeText={(v) => setNewItem({...newItem, unit: v})} />
            </View>
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} placeholder="Seuil d'alerte" keyboardType="numeric" value={newItem.minQuantity} onChangeText={(v) => setNewItem({...newItem, minQuantity: v})} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}><Text style={{ color: colors.muted, fontWeight: '600' }}>ANNULER</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleCreateItem} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: '#fff', fontWeight: '800' }}>CRÉER</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DECLARATION PERTE */}
      <Modal visible={isLossModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: '#ef4444' }]}>Déclarer une Perte</Text>
            <Text style={{color: colors.foreground, marginBottom: 15}}>Article : {selectedItemForLoss?.name}</Text>
            <TextInput 
                style={[styles.input, { color: colors.foreground, borderColor: '#ef4444' }]} 
                placeholder={`Qté perdue (${selectedItemForLoss?.unit})`} 
                keyboardType="numeric" 
                value={lossQty} 
                onChangeText={setLossQty} 
                autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsLossModalVisible(false)}><Text style={{ color: colors.muted, fontWeight: '600' }}>ANNULER</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleDeclareLoss} style={[styles.saveBtn, { backgroundColor: '#ef4444' }]}><Text style={{ color: '#fff', fontWeight: '800' }}>DÉDUIRE DU STOCK</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL LIER RECETTE (Inchangé mais conservé pour cohérence) */}
      <Modal visible={isRecipeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={{ fontWeight: '900', fontSize: 18, color: colors.foreground, marginBottom: 15 }}>Lier un ingrédient</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {stockItems.map((s: StockItem) => (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => setSelectedStockId(s.id)} 
                  style={[styles.stockOption, { backgroundColor: selectedStockId === s.id ? colors.primary : colors.background, borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Text style={{ fontWeight: 'bold', color: selectedStockId === s.id ? 'white' : colors.foreground }}>{s.name}</Text>
                  <Text style={{ fontSize: 10, color: selectedStockId === s.id ? 'white' : colors.muted }}>Unité : {s.unit}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput 
              style={[styles.input, { marginTop: 15, color: colors.foreground, borderColor: colors.border }]} 
              placeholder="Qté par plat (ex: 0.2)" 
              keyboardType="numeric" 
              value={qtyToConsume} 
              onChangeText={setQtyToConsume} 
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsRecipeModalVisible(false)}><Text style={{ color: colors.muted, fontWeight: '600' }}>ANNULER</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleAddIngredient} style={[styles.saveBtn, { backgroundColor: colors.primary }]}><Text style={{ color: 'white', fontWeight: '800' }}>LIER</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: { padding: 20, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  addButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  tabsRow: { flexDirection: 'row', gap: 20 },
  tab: { paddingVertical: 10 },
  tabText: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  scrollPadding: { padding: 20 },
  alertBanner: { padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#ef4444' },
  searchInput: { borderWidth: 1.5, borderRadius: 15, padding: 14, marginBottom: 20, fontSize: 16 },
  listContainer: { gap: 15 },
  itemCard: { borderRadius: 18, padding: 18, borderLeftWidth: 8, borderWidth: 1, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  itemName: { fontSize: 19, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 8, borderRadius: 12 },
  btnQty: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnLoss: { paddingHorizontal: 10, height: 40, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  qtyInput: { flex: 1, borderWidth: 1, borderRadius: 10, textAlign: 'center', height: 40, fontWeight: '900', fontSize: 16, backgroundColor: '#fff' },
  recetteContainer: { flex: 1, padding: 20 },
  recetteSplit: { flexDirection: 'row', gap: 15, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '900', opacity: 0.6, textTransform: 'uppercase' },
  menuItemMini: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  recetteDetail: { flex: 1.6, borderRadius: 18, borderWidth: 1, padding: 15 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  miniAddBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center', marginTop: 25 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 },
  stockOption: { padding: 12, borderRadius: 12, marginBottom: 8 }
});