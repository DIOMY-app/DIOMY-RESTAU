/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// @ts-ignore
import { ScreenContainer } from './components/screen-container';
// @ts-ignore
import { useColors } from './hooks/use-colors';
// @ts-ignore
import { formatPrice } from './lib/formatting';

// Exemple de panier (dans une version réelle, cela viendrait d'un Context ou de Redux)
const INITIAL_CART = [
  { id: '1', name: 'Poulet Braisé', price: 5000, quantity: 2 },
  { id: '2', name: 'Alloco', price: 1500, quantity: 1 },
  { id: '4', name: 'Bissap', price: 1000, quantity: 3 },
];

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const [cart, setCart] = useState(INITIAL_CART);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceCharge = subtotal * 0.05; // 5% de frais de service
  const total = subtotal + serviceCharge;

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const handleValidation = () => {
    Alert.alert(
      "Confirmer la commande",
      `Montant total : ${formatPrice(total)}`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Valider", 
          onPress: () => {
            console.log("Commande envoyée en cuisine");
            router.push('/(tabs)'); // Retour à l'accueil
          } 
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Panier</Text>
        <Text style={{ color: colors.muted }}>Table n° 12</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {cart.length > 0 ? (
          cart.map(item => (
            <View key={item.id} style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: colors.muted }]}>{formatPrice(item.price)} / unité</Text>
              </View>
              
              <View style={styles.controls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, -1)}
                  style={[styles.btn, { backgroundColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground }}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, 1)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#fff' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ color: colors.muted }}>Votre panier est vide</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.emptyBtn}>
              <Text style={{ color: colors.primary }}>Retourner au menu</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Résumé et Paiement */}
      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Sous-total</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Service (5%)</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(serviceCharge)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalText, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleValidation}
          >
            <Text style={styles.submitBtnText}>Envoyer en cuisine</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
  list: { padding: 20 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemPrice: { fontSize: 14, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  btn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
  footer: { padding: 20, borderTopWidth: 1, paddingBottom: 30 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  totalText: { fontSize: 18, fontWeight: 'bold' },
  totalAmount: { fontSize: 22, fontWeight: 'bold' },
  submitBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyBtn: { marginTop: 20 }
});