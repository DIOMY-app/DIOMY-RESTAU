/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/orders.tsx
 * Version : 3.6 - Accès Admin Universel & Redirection Menu
 * Règle n°2 : Code complet fourni.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';
import { refreshAppData } from '../services/data-service';

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  // RÉCUPÉRATION DU PANIER ACTIF
  const activeTab = state.activeTab ?? 0;
  const cart = state.carts[activeTab] || [];
  
  const user = state.user;
  
  // CORRECTION : L'Admin a désormais les mêmes droits que le caissier responsable ET le serveur
  const isCaissierResponsable = user?.id === state.activeCashierId || user?.role === 'admin';

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
   * LOGIQUE DE DÉSTOCKAGE PAR RECETTE
   */
  const processDestocking = async () => {
    try {
      for (const item of cart) {
        const { data: recipe, error: recipeError } = await supabase
          .from('menu_recettes')
          .select('stock_id, quantite_consommee')
          .eq('menu_id', item.menuItemId);

        if (recipeError) throw recipeError;

        if (recipe && recipe.length > 0) {
          for (const ingredient of recipe) {
            const totalToDeduct = ingredient.quantite_consommee * item.quantity;
            const { error: rpcError } = await supabase.rpc('deduire_stock', {
              item_id: ingredient.stock_id,
              qty_to_subtract: totalToDeduct
            });
            if (rpcError) {
                console.error(`Erreur stock pour ${item.name}:`, rpcError);
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Erreur déstockage globale:", error);
      return false;
    }
  };

  const handleValidation = async () => {
    if (cart.length === 0 || isProcessing) return;

    // L'admin peut choisir de valider directement ou d'envoyer en cuisine
    const actionText = isCaissierResponsable ? "Valider le paiement" : "Envoyer en cuisine";

    Alert.alert(
      "Confirmation",
      `${actionText} ?\nTotal : ${formatPrice(total)}`,
      [
        { text: "Modifier", style: "cancel" },
        { 
          text: "Confirmer", 
          onPress: async () => {
            setIsProcessing(true);
            try {
              await processDestocking();
              
              const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                  items: cart.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
                  total: total,
                  status: isCaissierResponsable ? 'paid' : 'pending',
                  payment_method: isCaissierResponsable ? 'cash' : null,
                  created_by: user?.id,
                  created_at: new Date().toISOString(),
                }])
                .select()
                .single();

              if (orderError) throw orderError;

              await supabase.from('preparation_cuisine').insert([{
                order_id: orderData.id,
                items: cart,
                status: 'waiting'
              }]);

              dispatch({ type: 'CLEAR_CART' });
              await refreshAppData(dispatch);
              
              Alert.alert(
                  isCaissierResponsable ? "Vente Terminée ✅" : "Commande Transmise 👨‍🍳", 
                  isCaissierResponsable ? "Le stock a été mis à jour." : "La cuisine a reçu le bon."
              );
              
              router.replace('/'); 
            } catch (err: any) {
              Alert.alert("Erreur Critique", err.message);
            } finally {
              setIsProcessing(false);
            }
          } 
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Panier Client {activeTab + 1}</Text>
        <View style={[styles.roleBadge, { backgroundColor: isCaissierResponsable ? '#dcfce7' : '#dbeafe' }]}>
            <Text style={{ color: isCaissierResponsable ? '#166534' : '#1e40af', fontWeight: 'bold', fontSize: 12 }}>
                {isCaissierResponsable ? "Mode Admin / Encaisssement" : "Mode Prise de Commande"}
            </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {cart.length > 0 ? (
          cart.map(item => (
            <View key={item.id} style={[styles.item, { borderBottomColor: colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: colors.muted }]}>
                  {formatPrice(item.price)} / unité
                </Text>
              </View>
              
              <View style={styles.controls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, -1)}
                  style={[styles.btn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
                  disabled={isProcessing}
                >
                  <Text style={{ color: colors.foreground, fontSize: 20 }}>-</Text>
                </TouchableOpacity>
                
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, 1)}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                  disabled={isProcessing}
                >
                  <Text style={{ color: '#fff', fontSize: 20 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 60, marginBottom: 20 }}>🛒</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Aucun article sélectionné</Text>
            <TouchableOpacity 
              onPress={() => router.push('/' as any)} // Retour à l'écran principal (Caisse/Menu)
              style={styles.emptyBtn}
            >
              <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>
                ALLER AU MENU POUR PRENDRE COMMANDE
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Sous-total</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Frais de service (5%)</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>{formatPrice(serviceCharge)}</Text>
          </View>
          
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.foreground }]}>NET À PAYER</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, { backgroundColor: isProcessing ? colors.muted : (isCaissierResponsable ? '#22c55e' : colors.primary) }]}
            onPress={handleValidation}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>
                  {isCaissierResponsable ? "VALIDER & ENCAISSER" : "ENVOYER LE BON EN CUISINE"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, paddingBottom: 15, borderBottomWidth: 1 },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  list: { paddingHorizontal: 25, paddingBottom: 100 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '800' },
  itemPrice: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  btn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  qty: { fontSize: 18, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  footer: { padding: 25, borderTopWidth: 1, paddingBottom: 45, borderTopLeftRadius: 35, borderTopRightRadius: 35, elevation: 25, shadowColor: '#000', shadowOffset: {width: 0, height: -12}, shadowOpacity: 0.1, shadowRadius: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 20, borderTopWidth: 1.5 },
  totalText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  totalAmount: { fontSize: 26, fontWeight: '900' },
  submitBtn: { borderRadius: 20, paddingVertical: 20, alignItems: 'center', marginTop: 25, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: '700' },
  emptyBtn: { marginTop: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderRadius: 15, borderStyle: 'dashed' }
});