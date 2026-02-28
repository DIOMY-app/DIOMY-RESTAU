/**
 * Menu Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/menu.tsx
 * Version : Stabilisée et typée pour APK
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';

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

  // Récupération sécurisée des catégories
  const categories = ['Tous', ...state.categories.map((c: Category) => c.name)];

  // Filtrage basé sur les clés formatées par data-service
  const filteredItems = state.menuItems.filter((item: MenuItem) => {
    const itemName = item.name || '';
    const itemCat = item.category || '';
    
    const matchesSearch = itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || itemCat === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item: MenuItem) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: Math.random().toString(36).substring(2, 11), // ID unique d'instance dans le panier
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        quantite: 1 // Double mapping pour compatibilité Reducer
      }
    });
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
            <Text style={[styles.infoText, { color: colors.muted, marginTop: 10 }]}>Chargement du menu...</Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item: MenuItem) => (
            <View 
              key={item.id} 
              style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.itemInfo}>
                <View style={styles.flex1}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.muted }]} numberOfLines={2}>
                    {item.description || "Aucune description disponible."}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  {formatPrice(item.price)}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.addBtn, 
                  { backgroundColor: item.available ? colors.primary : colors.muted }
                ]}
                onPress={() => item.available && handleAddToCart(item)}
                activeOpacity={0.7}
                disabled={!item.available}
              >
                <Text style={styles.addBtnText}>
                  {item.available ? "Ajouter à la commande" : "Indisponible"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.center}>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              {searchQuery ? "Aucun plat ne correspond à votre recherche." : "Le menu est vide pour le moment."}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 15, letterSpacing: -1 },
  searchInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: { paddingLeft: 20, marginBottom: 10, marginTop: 5 },
  categoryBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    marginRight: 10,
  },
  categoryText: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  listContent: { padding: 20, gap: 16, paddingBottom: 100 },
  itemCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  flex1: { flex: 1, paddingRight: 15 },
  itemName: { fontSize: 19, fontWeight: '800' },
  itemDesc: { fontSize: 14, marginTop: 5, lineHeight: 20 },
  itemPrice: { fontSize: 17, fontWeight: '900' },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  infoText: { textAlign: 'center', fontSize: 16, fontWeight: '600' }
});