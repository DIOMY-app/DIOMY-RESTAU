/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/orders.tsx
 * Version : Validation + Déstockage via RPC (Sécurisé)
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';
import { refreshAppData } from '../services/data-service';
import { Order } from '../types';

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  const cart = state.cart || [];

  // Calculs financiers
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceCharge = subtotal * 0.05; 
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

  /**
   * LOGIQUE DE DÉSTOCKAGE VIA RPC (SÉCURISÉ)
   */
  const processDestocking = async () => {
    try {
      for (const item of cart) {
        // 1. Récupérer les ingrédients de la recette
        const { data: recipe, error: recipeError } = await supabase
          .from('menu_recettes')
          .select('stock_id, quantite_consommee')
          .eq('menu_id', parseInt(item.id));

        if (recipeError) throw recipeError;

        if (recipe && recipe.length > 0) {
          for (const ingredient of recipe) {
            const totalToDeduct = ingredient.quantite_consommee * item.quantity;

            // 2. Appel de la fonction SQL 'deduire_stock'
            const { error: rpcError } = await supabase.rpc('deduire_stock', {
              item_id: ingredient.stock_id,
              qty_to_subtract: totalToDeduct
            });

            if (rpcError) throw rpcError;
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Erreur déstockage RPC:", error);
      return false;
    }
  };

  const handleValidation = async () => {
    if (cart.length === 0 || isProcessing) return;

    Alert.alert(
      "Confirmer la commande",
      `Valider l'envoi en cuisine ?\nTotal : ${formatPrice(total)}`,
      [
        { text: "Modifier", style: "cancel" },
        { 
          text: "Valider", 
          onPress: async () => {
            setIsProcessing(true);
            
            // A. Déstockage automatique
            const destockSuccess = await processDestocking();
            
            // B. Objet Order conforme
            const newOrder: Order = {
              id: Date.now().toString(),
              items: [...cart],
              total: total,
              status: 'pending',
              paymentMethod: 'cash',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // C. Enregistrement local et reset panier
            dispatch({ type: 'ADD_ORDER', payload: newOrder });
            dispatch({ type: 'CLEAR_CART' });

            // D. Synchro pour voir les nouvelles alertes de stock
            await refreshAppData(dispatch);

            setIsProcessing(false);
            
            if (destockSuccess) {
              Alert.alert("Succès", "Commande validée ! Le stock a été mis à jour.");
            } else {
              Alert.alert("Attention", "Commande validée, mais le stock n'a pas pu être mis à jour automatiquement.");
            }
            
            router.replace('/'); 
          } 
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Panier</Text>
        <Text style={{ color: colors.muted, fontWeight: '600' }}>Vérification des plats</Text>
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
                  disabled={isProcessing}
                >
                  <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, 1)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  disabled={isProcessing}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 50, marginBottom: 20 }}>🛒</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Panier vide</Text>
            <TouchableOpacity onPress={() => router.push('/menu')} style={styles.emptyBtn}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Retour au menu</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Sous-total</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted }}>Frais service (5%)</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(serviceCharge)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.foreground }]}>TOTAL</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: isProcessing ? colors.muted : colors.primary }]}
            onPress={handleValidation}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>VALIDER LA COMMANDE</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: '900' },
  list: { paddingHorizontal: 25, paddingBottom: 40 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700' },
  itemPrice: { fontSize: 14, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 17, fontWeight: '800', minWidth: 25, textAlign: 'center' },
  footer: { padding: 25, borderTopWidth: 1, paddingBottom: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRow: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
  totalText: { fontSize: 20, fontWeight: '900' },
  totalAmount: { fontSize: 24, fontWeight: '900' },
  submitBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 25, minHeight: 60, justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptyBtn: { marginTop: 15, padding: 10 }
});