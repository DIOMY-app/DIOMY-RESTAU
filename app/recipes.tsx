/**
 * RecipeEditorScreen - O'PIED DU MONT
 * Emplacement : /app/recipes.tsx
 * Correction : Chemins d'imports ajustés et typage TypeScript
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Modal, TextInput, Alert, ActivityIndicator, ScrollView
} from 'react-native';

// Chemins ajustés : un seul "../" car le fichier est à la racine de /app
import { supabase } from '../supabase';
import { useColors } from '../hooks/use-colors';
import { useApp } from '../app-context';
import { StockItem } from '../types';

type RecipeLink = {
  id: number;
  stock_id: number;
  quantite_consommee: number;
  stock_name?: string;
};

export default function RecipeEditorScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [selectedMenuItem, setSelectedMenuItem] = useState<any>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeLink[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [qtyToConsume, setQtyToConsume] = useState('');

  useEffect(() => {
    if (selectedMenuItem) {
      loadRecipe(selectedMenuItem.id);
    }
  }, [selectedMenuItem]);

  const loadRecipe = async (menuId: string) => {
    setLoading(true);
    try {
        const { data, error } = await supabase
          .from('menu_recettes')
          .select(`
            id, 
            stock_id, 
            quantite_consommee,
            stock:stock_id (nom)
          `)
          .eq('menu_id', parseInt(menuId));

        if (error) throw error;

        if (data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            stock_id: d.stock_id,
            quantite_consommee: d.quantite_consommee,
            stock_name: d.stock?.nom || 'Inconnu'
          }));
          setRecipeItems(formatted);
        }
    } catch (err: any) {
        Alert.alert("Erreur de chargement", err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedStockId || !qtyToConsume) {
        Alert.alert("Attention", "Veuillez choisir un ingrédient et une quantité.");
        return;
    }

    const { error } = await supabase
      .from('menu_recettes')
      .insert([{
        menu_id: parseInt(selectedMenuItem.id),
        stock_id: parseInt(selectedStockId),
        quantite_consommee: parseFloat(qtyToConsume.replace(',', '.'))
      }]);

    if (error) {
      Alert.alert("Erreur", error.message);
    } else {
      setIsModalVisible(false);
      setQtyToConsume('');
      setSelectedStockId('');
      loadRecipe(selectedMenuItem.id);
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    const { error } = await supabase.from('menu_recettes').delete().eq('id', id);
    if (!error) loadRecipe(selectedMenuItem.id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>🍳 Recettes</Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>Liez vos plats aux ingrédients du stock.</Text>

      <View style={styles.mainRow}>
        {/* LISTE DES PLATS */}
        <View style={styles.leftCol}>
          <FlatList
            data={state.menuItems}
            keyExtractor={(item) => item.id}
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
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>{item.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>{item.category}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* DETAILS DE LA RECETTE */}
        <View style={[styles.rightCol, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {selectedMenuItem ? (
            <>
              <Text style={[styles.subtitle, { color: colors.foreground }]}>{selectedMenuItem.name}</Text>
              
              {loading ? <ActivityIndicator color={colors.primary} /> : (
                <FlatList
                  data={recipeItems}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <View style={[styles.recipeRow, { borderBottomColor: colors.border }]}>
                      <Text style={{ color: colors.foreground, flex: 1 }}>• {item.stock_name}</Text>
                      <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{item.quantite_consommee}</Text>
                      <TouchableOpacity onPress={() => handleDeleteIngredient(item.id)}>
                        <Text style={{ color: '#ef4444', marginLeft: 15, fontWeight: 'bold' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>Aucun ingrédient.</Text>}
                />
              )}

              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Ajouter</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ color: colors.muted, textAlign: 'center' }}>Sélectionnez un plat à gauche</Text>
            </View>
          )}
        </View>
      </View>

      {/* MODAL AJOUT */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.foreground }}>Ajouter un ingrédient</Text>
            
            <Text style={[styles.label, { color: colors.muted }]}>Ingrédient :</Text>
            <ScrollView style={styles.pickerSimu}>
              {state.stockItems.map((s: StockItem) => (
                <TouchableOpacity 
                  key={s.id} 
                  onPress={() => setSelectedStockId(s.id)}
                  style={[
                    styles.stockOption, 
                    { backgroundColor: selectedStockId === s.id ? colors.primary : colors.background }
                  ]}
                >
                  <Text style={{ color: selectedStockId === s.id ? 'white' : colors.foreground }}>
                    {s.name} ({s.unit})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.muted }]}>Quantité consommée :</Text>
            <TextInput 
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder="Ex: 0.5"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={qtyToConsume}
              onChangeText={setQtyToConsume}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={styles.flexBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={{ color: colors.muted }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.flexBtn, { backgroundColor: '#22c55e' }]} onPress={handleAddIngredient}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 5 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  mainRow: { flex: 1, flexDirection: 'row', gap: 12 },
  leftCol: { flex: 1 },
  rightCol: { flex: 1.5, borderRadius: 20, borderWidth: 1.5, padding: 16 },
  itemCard: { padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  recipeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  addBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, padding: 20, borderRadius: 24 },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '700' },
  pickerSimu: { maxHeight: 200, marginBottom: 10 },
  stockOption: { padding: 12, borderRadius: 10, marginBottom: 6 },
  flexBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' }
});