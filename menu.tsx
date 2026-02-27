/**
 * Menu Screen - O'PIED DU MONT Mobile
 * Connecté à Supabase et au Panier
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

// @ts-ignore
import { ScreenContainer } from './components/screen-container';
// @ts-ignore
import { useColors } from './hooks/use-colors';
// @ts-ignore
import { formatPrice } from './lib/formatting';
// @ts-ignore
import { useApp } from './app-context';
// @ts-ignore
import { useCart } from '../context/cart-context';

export default function MenuScreen() {
  const colors = useColors();
  const { state } = useApp(); // Données de Supabase
  const { addToCart } = useCart(); // Action du panier
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  // On récupère les catégories dynamiquement
  const categories = ['Tous', ...state.categories.map((c: any) => c.nom)];

  const filteredItems = state.menuItems.filter((item: any) => {
    const matchesSearch = item.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Tous' || item.categorie === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredItems.map((item: any) => (
          <View 
            key={item.id} 
            style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.itemInfo}>
              <View style={styles.flex1}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.nom}</Text>
                <Text style={[styles.itemDesc, { color: colors.muted }]}>{item.description}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: colors.primary }]}>
                {formatPrice(item.prix || item.price)}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => addToCart({
                id: item.id,
                name: item.nom,
                price: item.prix || item.price
              })}
            >
              <Text style={styles.addBtnText}>Ajouter à la commande</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Correction ici : state.isLoading au lieu de state.loading (Règle n°4) */}
        {state.isLoading && (
          <Text style={[styles.emptyText, { color: colors.muted }]}>Chargement du menu...</Text>
        )}

        {!state.isLoading && filteredItems.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Aucun plat trouvé pour cette recherche.
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: { paddingLeft: 20, marginBottom: 20 },
  categoryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  categoryText: { fontWeight: '600', fontSize: 14 },
  listContent: { padding: 20, gap: 15 },
  itemCard: {
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  flex1: { flex: 1, paddingRight: 10 },
  itemName: { fontSize: 18, fontWeight: 'bold' },
  itemDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  itemPrice: { fontSize: 16, fontWeight: 'bold' },
  addBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16 }
});