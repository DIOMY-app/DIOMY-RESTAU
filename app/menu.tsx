/**
 * Menu Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/menu.tsx
 * Version : 3.7 - Accès Admin débloqué & Gestion Accompagnements
 * Règle n°2 : Code complet fourni.
 */

import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, ActivityIndicator, Modal, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { MenuItem, Category } from '../types';

export default function MenuScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp(); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  
  // États pour la gestion des accompagnements
  const [showAccompModal, setShowAccompModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  // Vérification du rôle pour adapter l'interface si besoin
  const isAdmin = state.user?.role === 'admin';

  const categories = ['Tous', ...state.categories.map((c: Category) => c.name)];

  const filteredItems = state.menuItems.filter((item: MenuItem) => {
    const itemName = item.name || '';
    const itemCat = item.category || '';
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || itemCat === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Accompagnements ivoiriens
  const ACCOMPAGNEMENTS_GRILLADES = ["Attiéké", "Aloco", "Frites", "Salade", "Riz Gras"];
  const ACCOMPAGNEMENTS_SAUCES = ["Riz Blanc", "Foutou Banane", "Placali", "Tô"];

  const handlePressItem = (item: MenuItem) => {
    const itemNameLower = item.name.toLowerCase();
    const itemCatLower = (item.category || '').toLowerCase();

    const isSauce = itemNameLower.includes('sauce') || itemCatLower.includes('sauce');
    const isGrillade = itemCatLower.includes('grillade') || itemNameLower.includes('grillé') || itemNameLower.includes('pintade') || itemNameLower.includes('poulet');

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
        id: `${item.id}-${Date.now()}`, 
        menuItemId: item.id,
        name: finalName,
        price: item.price,
        quantity: 1,
        quantite: 1 
      }
    });

    if (showAccompModal) {
      setShowAccompModal(false);
      setPendingItem(null);
    }

    // Petit feedback visuel pour l'admin/serveur
    Alert.alert("Ajouté", `${finalName} est dans le panier.`);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={[styles.title, { color: colors.foreground, marginBottom: 0 }]}>La Carte</Text>
          <TouchableOpacity 
            onPress={() => router.push('/orders' as any)}
            style={[styles.cartBadge, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Voir Panier</Text>
          </TouchableOpacity>
        </View>

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
                    {item.description || "O'PIED DU MONT Special"}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {item.price === 0 ? "—" : formatPrice(item.price)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.addBtn, { backgroundColor: item.available ? (isAdmin ? '#22c55e' : colors.primary) : colors.muted }]}
                onPress={() => item.available && handlePressItem(item)}
                disabled={!item.available}
              >
                <Text style={styles.addBtnText}>
                  {item.available ? (isAdmin ? "PRENDRE LA COMMANDE" : "AJOUTER") : "ÉPUISÉ"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.center}>
            <Text style={{color: colors.muted, fontWeight: '600'}}>Aucun plat trouvé.</Text>
          </View>
        )}
      </ScrollView>

      {/* MODAL DE SÉLECTION D'ACCOMPAGNEMENT */}
      <Modal visible={showAccompModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalIndicator} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Accompagnement</Text>
            <Text style={{ color: colors.muted, marginBottom: 25, fontSize: 16 }}>
              Choix pour : <Text style={{fontWeight:'bold', color: colors.primary}}>{pendingItem?.name}</Text>
            </Text>
            
            <View style={styles.accompGrid}>
              {(pendingItem?.name.toLowerCase().includes('sauce') ? ACCOMPAGNEMENTS_SAUCES : ACCOMPAGNEMENTS_GRILLADES).map((acc) => (
                <TouchableOpacity 
                  key={acc} 
                  style={[styles.accompOption, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => pendingItem && addToCart(pendingItem, acc)}
                >
                  <Text style={[styles.accompText, { color: colors.foreground }]}>{acc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.closeBtn, { backgroundColor: colors.border + '50' }]} 
              onPress={() => { setShowAccompModal(false); setPendingItem(null); }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 16 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  cartBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  searchInput: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, fontWeight: '600' },
  categoryContainer: { paddingLeft: 20, marginBottom: 10, marginTop: 5 },
  categoryBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1.5, marginRight: 10 },
  categoryText: { fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  listContent: { padding: 20, gap: 16, paddingBottom: 120 },
  itemCard: { padding: 18, borderRadius: 24, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  flex1: { flex: 1, paddingRight: 15 },
  itemName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  itemDesc: { fontSize: 13, marginTop: 4, lineHeight: 18, opacity: 0.8 },
  itemPrice: { fontSize: 18, fontWeight: '900' },
  addBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, textTransform: 'uppercase' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40, minHeight: 450 },
  modalIndicator: { width: 40, height: 5, backgroundColor: '#ccc', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 5 },
  accompGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 35 },
  accompOption: { padding: 18, borderRadius: 18, borderWidth: 1.5, width: '47%', alignItems: 'center', justifyContent: 'center' },
  accompText: { fontWeight: '800', fontSize: 15 },
  closeBtn: { padding: 18, borderRadius: 18, alignItems: 'center' }
});