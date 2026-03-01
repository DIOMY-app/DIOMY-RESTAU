/**
 * Menu Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/menu.tsx
 * Version : Gestion des accompagnements (Sauces/Grillades) et filtres PDF
 */

import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, ActivityIndicator, Modal, Alert 
} from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { MenuItem, Category } from '../types';

export default function MenuScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp(); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  
  // États pour la gestion des accompagnements
  const [showAccompModal, setShowAccompModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  const categories = ['Tous', ...state.categories.map((c: Category) => c.name)];

  const filteredItems = state.menuItems.filter((item: MenuItem) => {
    const itemName = item.name || '';
    const itemCat = item.category || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || itemCat === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Définition des accompagnements disponibles selon le type de plat
  const ACCOMPAGNEMENTS_GRILLADES = ["Attiéké", "Aloco", "Frites de pomme de terre", "Salade"];
  const ACCOMPAGNEMENTS_SAUCES = ["Riz Blanc"];

  const handlePressItem = (item: MenuItem) => {
    // Si c'est une sauce ou une grillade, on demande l'accompagnement
    const isSauce = item.name.toLowerCase().includes('sauce');
    const isGrillade = item.category === 'Grillades' || item.name.toLowerCase().includes('grillé') || item.name.toLowerCase().includes('pintade');

    if (isSauce || isGrillade) {
      setPendingItem(item);
      setShowAccompModal(true);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, accompagnement?: string) => {
    const finalName = accompagnement ? `${item.name} (+ ${accompagnement})` : item.name;
    
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: Math.random().toString(36).substring(2, 11),
        menuItemId: item.id,
        name: finalName,
        price: item.price,
        quantity: 1,
        quantite: 1
      }
    });

    if (showAccompModal) setShowAccompModal(false);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notre Carte</Text>
        <TextInput
          style={[styles.searchInput, { 
            borderColor: colors.border, 
            backgroundColor: colors.surface,
            color: colors.foreground 
          }]}
          placeholder="Rechercher un plat..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 40 }}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.categoryBadge,
                { borderColor: colors.primary },
                activeCategory === cat ? { backgroundColor: colors.primary } : { backgroundColor: 'transparent' }
              ]}
            >
              <Text style={[
                styles.categoryText,
                activeCategory === cat ? { color: '#fff' } : { color: colors.primary }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {state.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item: MenuItem) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <View style={styles.flex1}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.muted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {item.price === 0 ? "Prix à fixer" : formatPrice(item.price)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: item.available ? colors.primary : colors.muted }]}
                onPress={() => item.available && handlePressItem(item)}
                disabled={!item.available}
              >
                <Text style={styles.addBtnText}>
                  {item.available ? "Ajouter à la commande" : "Indisponible"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.center}><Text style={{color: colors.muted}}>Aucun plat trouvé.</Text></View>
        )}
      </ScrollView>

      {/* MODAL DE SÉLECTION D'ACCOMPAGNEMENT */}
      <Modal visible={showAccompModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choisissez l'accompagnement</Text>
            <Text style={{ color: colors.muted, marginBottom: 20 }}>Pour : {pendingItem?.name}</Text>
            
            <View style={styles.accompGrid}>
              {(pendingItem?.name.toLowerCase().includes('sauce') ? ACCOMPAGNEMENTS_SAUCES : ACCOMPAGNEMENTS_GRILLADES).map((acc) => (
                <TouchableOpacity 
                  key={acc} 
                  style={[styles.accompOption, { borderColor: colors.border }]}
                  onPress={() => pendingItem && addToCart(pendingItem, acc)}
                >
                  <Text style={[styles.accompText, { color: colors.foreground }]}>{acc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.closeBtn, { backgroundColor: colors.border }]} 
              onPress={() => setShowAccompModal(false)}
            >
              <Text style={{ color: colors.foreground, fontWeight: '700' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 15, letterSpacing: -1 },
  searchInput: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16 },
  categoryContainer: { paddingLeft: 20, marginBottom: 10, marginTop: 5 },
  categoryBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1.5, marginRight: 10 },
  categoryText: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  listContent: { padding: 20, gap: 16, paddingBottom: 100 },
  itemCard: { padding: 18, borderRadius: 20, borderWidth: 1, elevation: 3 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  flex1: { flex: 1, paddingRight: 15 },
  itemName: { fontSize: 19, fontWeight: '800' },
  itemDesc: { fontSize: 14, marginTop: 5, lineHeight: 20 },
  itemPrice: { fontSize: 17, fontWeight: '900' },
  addBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  // Styles Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, minHeight: 400 },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 5 },
  accompGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  accompOption: { padding: 15, borderRadius: 15, borderWidth: 1.5, minWidth: '45%', alignItems: 'center' },
  accompText: { fontWeight: '700', fontSize: 16 },
  closeBtn: { padding: 18, borderRadius: 15, alignItems: 'center' }
});