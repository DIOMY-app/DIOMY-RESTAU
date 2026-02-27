/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/orders.tsx
 * Connecté au State Global (AppContext)
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();

  const cart = state.cart || [];

  // Calculs financiers
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceCharge = subtotal * 0.05; // 5% de frais de service
  const total = subtotal + serviceCharge;

  const updateQuantity = (id: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    
    if (newQty <= 0) {
      dispatch({ type: 'REMOVE_FROM_CART', payload: id });
    } else {
      dispatch({ 
        type: 'UPDATE_CART_ITEM', 
        payload: { id, quantite: newQty } 
      });
    }
  };

  const handleValidation = () => {
    if (cart.length === 0) return;

    Alert.alert(
      "Confirmer la commande",
      `Envoyer la commande en cuisine pour un total de ${formatPrice(total)} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Valider", 
          onPress: () => {
            // 1. On crée l'objet commande pour l'historique
            const newOrder = {
              id: Date.now().toString(),
              items: [...cart],
              total: total,
              statut: 'attente',
              created_at: new Date().toISOString(),
            };

            // 2. On ajoute à la liste des commandes et on vide le panier
            // @ts-ignore - selon votre interface Order
            dispatch({ type: 'ADD_ORDER', payload: newOrder });
            dispatch({ type: 'CLEAR_CART' });

            Alert.alert("Succès", "La commande a été transmise à la cuisine.");
            router.replace('/'); // Retour à l'accueil
          } 
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Panier / Commande</Text>
        <Text style={{ color: colors.muted, fontWeight: '600' }}>Service en cours</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {cart.length > 0 ? (
          cart.map(item => (
            <View key={item.id} style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: colors.muted }]}>
                  {formatPrice(item.price)} x {item.quantity}
                </Text>
              </View>
              
              <View style={styles.controls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, -1)}
                  style={[styles.btn, { backgroundColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, 1)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 50, marginBottom: 20 }}>🛒</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Votre panier est vide</Text>
            <TouchableOpacity onPress={() => router.push('/menu')} style={styles.emptyBtn}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                Consulter le menu
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Résumé et Validation */}
      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Sous-total</Text>
            <Text style={{ color: colors.foreground, fontSize: 15 }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Service (5%)</Text>
            <Text style={{ color: colors.foreground, fontSize: 15 }}>{formatPrice(serviceCharge)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.foreground }]}>Total TTC</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleValidation}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Envoyer en cuisine</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  list: { paddingHorizontal: 25, paddingBottom: 40 },
  item: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 20, 
    borderBottomWidth: 1 
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700' },
  itemPrice: { fontSize: 14, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 17, fontWeight: '800', minWidth: 25, textAlign: 'center' },
  footer: { 
    padding: 25, 
    borderTopWidth: 1, 
    paddingBottom: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRow: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
  totalText: { fontSize: 20, fontWeight: '900' },
  totalAmount: { fontSize: 24, fontWeight: '900' },
  submitBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 25 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptyBtn: { marginTop: 15, padding: 10 }
});