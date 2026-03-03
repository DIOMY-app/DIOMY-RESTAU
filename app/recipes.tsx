/**
 * RecipeEditorScreen - O'PIED DU MONT
 * Emplacement : /app/recipes.tsx
 * Rôle : Gestion des fiches techniques (Liaison Menu <-> Stock)
 * Version : Corrigée avec typage complet et gestion des états
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';

import { supabase } from '../supabase';
import { useColors } from '../hooks/use-colors';
import { useApp } from '../app-context';
import { StockItem, MenuItem } from '../types';

type RecipeLink = {
  id: number;
  stock_id: number;
  quantite_consommee: number;
  stock_name?: string;
  unit?: string;
};

export default function RecipeEditorScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [qtyToConsume, setQtyToConsume] = useState('');

  // Recharger la recette quand on change de plat sélectionné
  useEffect(() => {
    if (selectedMenuItem) {
      loadRecipe(selectedMenuItem.id);
    }
  }, [selectedMenuItem]);

  const loadRecipe = async (menuId: string | number) => {
    setLoading(true);
    try {
        const { data, error } = await supabase
          .from('menu_recettes')
          .select(`
            id, 
            stock_id, 
            quantite_consommee,
            stock:stock_id (nom, unite)
          `)
          .eq('menu_id', menuId);

        if (error) throw error;

        if (data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            stock_id: d.stock_id,
            quantite_consommee: d.quantite_consommee,
            stock_name: d.stock?.nom || 'Inconnu',
            unit: d.stock?.unite || ''
          }));
          setRecipeItems(formatted);
        }
    } catch (err: any) {
        Alert.alert("Erreur", "Impossible de charger la fiche technique.");
    } finally {
        setLoading(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedMenuItem || !selectedStockId || !qtyToConsume) {
        Alert.alert("Champs requis", "Sélectionnez un ingrédient et indiquez la quantité.");
        return;
    }

    const numericQty = parseFloat(qtyToConsume.replace(',', '.'));
    if (isNaN(numericQty) || numericQty <= 0) {
      Alert.alert("Format invalide", "La quantité doit être un nombre supérieur à 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('menu_recettes')
        .insert([{
          menu_id: selectedMenuItem.id,
          stock_id: parseInt(selectedStockId),
          quantite_consommee: numericQty
        }]);

      if (error) throw error;

      setIsModalVisible(false);
      setQtyToConsume('');
      setSelectedStockId('');
      loadRecipe(selectedMenuItem.id);
    } catch (error: any) {
      Alert.alert("Erreur", "Cet ingrédient est peut-être déjà présent dans la recette.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIngredient = (id: number) => {
    Alert.alert(
      "Supprimer",
      "Retirer cet ingrédient de la fiche technique ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase.from('menu_recettes').delete().eq('id', id);
            if (!error) loadRecipe(selectedMenuItem!.id);
            else Alert.alert("Erreur", "Action impossible.");
          } 
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Fiches Techniques</Text>
        <Text style={[styles.subtitleLabel, { color: colors.muted }]}>Liaison Menu & Stocks</Text>
      </View>

      <View style={styles.mainRow}>
        {/* LISTE DES PLATS (MASTER) */}
        <View style={styles.leftCol}>
          <FlatList
            data={state.menuItems}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.itemCard, 
                  { 
                    backgroundColor: colors.surface, 
                    borderColor: selectedMenuItem?.id === item.id ? colors.primary : colors.border 
                  }
                ]}
                onPress={() => setSelectedMenuItem(item)}
              >
                <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.itemCat, { color: colors.muted }]}>{item.category.toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* DETAILS RECETTE (DETAIL) */}
        <View style={[styles.rightCol, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {selectedMenuItem ? (
            <>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailTitle, { color: colors.foreground }]}>{selectedMenuItem.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>COMPOSITION</Text>
              </View>
              
              {loading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
              ) : (
                <FlatList
                  data={recipeItems}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[styles.recipeRow, { borderBottomColor: colors.border + '50' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.ingName, { color: colors.foreground }]}>{item.stock_name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>Déstockage par unité vendue</Text>
                      </View>
                      <View style={styles.qtyContainer}>
                        <Text style={[styles.qtyValue, { color: colors.primary }]}>
                          {item.quantite_consommee}
                        </Text>
                        <Text style={[styles.qtyUnit, { color: colors.muted }]}>{item.unit}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteIngredient(item.id)} style={styles.deleteBtn}>
                        <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 18 }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.muted }]}>
                          Aucun ingrédient configuré pour ce plat.
                        </Text>
                    </View>
                  }
                />
              )}

              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.addBtnText}>+ CONFIGURER INGRÉDIENT</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.center}>
                <Text style={[styles.placeholderText, { color: colors.muted }]}>
                  Sélectionnez un article à gauche pour gérer sa fiche technique.
                </Text>
            </View>
          )}
        </View>
      </View>

      {/* MODAL AJOUT */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Lier au stock</Text>
            
            <Text style={[styles.label, { color: colors.muted }]}>Ingrédient à consommer :</Text>
            <ScrollView style={styles.pickerSimu} showsVerticalScrollIndicator={false}>
              {state.stockItems.map((s: StockItem) => (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => setSelectedStockId(s.id.toString())}
                  style={[
                    styles.stockOption, 
                    { 
                      backgroundColor: selectedStockId === s.id.toString() ? colors.primary : colors.background,
                      borderColor: colors.border
                    }
                  ]}
                >
                  <Text style={{ 
                    color: selectedStockId === s.id.toString() ? 'white' : colors.foreground,
                    fontWeight: '700'
                  }}>
                    {s.name} <Text style={{ fontSize: 11, fontWeight: '400' }}>({s.unit})</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.muted }]}>Quantité consommée par vente :</Text>
            <TextInput 
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Ex: 0.5"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={qtyToConsume}
              onChangeText={setQtyToConsume}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => { setIsModalVisible(false); setSelectedStockId(''); setQtyToConsume(''); }}
              >
                <Text style={{ color: colors.muted, fontWeight: '800' }}>ANNULER</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.valBtn, { backgroundColor: colors.primary }]} 
                onPress={handleAddIngredient}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.valBtnText}>VALIDER</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  header: { marginBottom: 25 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitleLabel: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  mainRow: { flex: 1, flexDirection: 'row', gap: 20 },
  leftCol: { flex: 1 },
  rightCol: { flex: 1.8, borderRadius: 30, borderWidth: 1.5, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemCard: { padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 10 },
  itemName: { fontWeight: '800', fontSize: 15 },
  itemCat: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  detailHeader: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 15 },
  detailTitle: { fontSize: 22, fontWeight: '900', marginBottom: 5 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  ingName: { fontWeight: '700', fontSize: 15 },
  qtyContainer: { alignItems: 'flex-end', marginRight: 15 },
  qtyValue: { fontSize: 18, fontWeight: '900' },
  qtyUnit: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  addBtn: { padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 15 },
  addBtnText: { color: 'white', fontWeight: '900', fontSize: 13 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { textAlign: 'center', fontStyle: 'italic', fontSize: 13 },
  placeholderText: { textAlign: 'center', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 450, padding: 30, borderRadius: 35 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 15 },
  label: { fontSize: 11, fontWeight: '900', marginTop: 20, marginBottom: 10, textTransform: 'uppercase' },
  input: { borderWidth: 2, borderRadius: 15, padding: 16, fontSize: 20, fontWeight: '800' },
  pickerSimu: { maxHeight: 200 },
  stockOption: { padding: 16, borderRadius: 15, marginBottom: 8, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 30 },
  cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
  valBtn: { flex: 1.5, padding: 18, borderRadius: 18, alignItems: 'center' },
  valBtnText: { color: 'white', fontWeight: '900' }
});