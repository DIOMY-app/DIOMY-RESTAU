/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/orders.tsx
 * Version : Corrigée (Navigation + Types)
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
  const user = state.user;
  const currentSession = state.currentSession;

  // Déterminer le rôle actuel par rapport à la session
  const isCaissier = user?.role === 'admin' || (currentSession && currentSession.employe_id === user?.id);

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
   * LOGIQUE DE DÉSTOCKAGE VIA RPC
   */
  const processDestocking = async () => {
    try {
      for (const item of cart) {
        const { data: recipe, error: recipeError } = await supabase
          .from('menu_recettes')
          .select('stock_id, quantite_consommee')
          .eq('menu_id', parseInt(item.menuItemId || item.id));

        if (recipeError) throw recipeError;

        if (recipe && recipe.length > 0) {
          for (const ingredient of recipe) {
            const totalToDeduct = ingredient.quantite_consommee * item.quantity;
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

    if (isCaissier && !currentSession && user?.role !== 'admin') {
      Alert.alert("Erreur", "Aucune session de caisse ouverte. Veuillez ouvrir la caisse d'abord.");
      return;
    }

    const actionText = isCaissier ? "Valider le paiement" : "Envoyer en cuisine";

    Alert.alert(
      "Confirmation",
      `${actionText} ?\nTotal : ${formatPrice(total)}`,
      [
        { text: "Modifier", style: "cancel" },
        { 
          text: "Confirmer", 
          onPress: async () => {
            setIsProcessing(true);
            
            const destockSuccess = await processDestocking();
            
            const newOrder = {
              items: [...cart],
              total: total,
              status: isCaissier ? 'paid' : 'pending',
              payment_method: 'cash',
              created_by: user?.id,
              session_id: currentSession?.id || null,
              created_at: new Date().toISOString(),
            };

            const { error: orderError } = await supabase.from('orders').insert([newOrder]);

            if (orderError) {
                Alert.alert("Erreur", "Impossible d'enregistrer la commande.");
                setIsProcessing(false);
                return;
            }

            dispatch({ type: 'CLEAR_CART' });
            await refreshAppData(dispatch);
            setIsProcessing(false);
            
            Alert.alert(
                isCaissier ? "Encaissé !" : "Envoyé !", 
                isCaissier ? "Le paiement a été validé." : "Commande en attente de paiement."
            );
            
            router.replace('/'); 
          } 
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <View>
                <Text style={[styles.title, { color: colors.foreground }]}>Panier</Text>
                <Text style={{ color: colors.muted, fontWeight: '600' }}>
                    {isCaissier ? "Mode Caissier (Encaisser)" : "Mode Serveur (Commander)"}
                </Text>
            </View>
            {isCaissier && <View style={styles.badge}><Text style={styles.badgeText}>CAISSE</Text></View>}
        </View>
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
            <TouchableOpacity onPress={() => router.push('/menu' as any)} style={styles.emptyBtn}>
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
            style={[styles.submitBtn, { backgroundColor: isProcessing ? colors.muted : (isCaissier ? '#2ecc71' : colors.primary) }]}
            onPress={handleValidation}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                  {isCaissier ? "VALIDER LE PAIEMENT (CASH)" : "ENVOYER EN CUISINE"}
              </Text>
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
  badge: { backgroundColor: '#2ecc71', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
  list: { paddingHorizontal: 25, paddingBottom: 40 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '700' },
  itemPrice: { fontSize: 14, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 17, fontWeight: '800', minWidth: 25, textAlign: 'center' },
  footer: { padding: 25, borderTopWidth: 1, paddingBottom: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 10 },
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