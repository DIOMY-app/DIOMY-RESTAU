/**
 * Orders / Cart Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/orders.tsx
 * Version : 3.7 - Flux de commande fluide & Bouton d'action rapide
 * Règle n°2 : Code complet fourni.
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

export default function OrdersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  // RÉCUPÉRATION DU PANIER ACTIF
  const activeTab = state.activeTab ?? 0;
  const cart = state.carts[activeTab] || [];
  const user = state.user;
  
  // Droits Admin ou Caissier
  const isCaissierResponsable = user?.id === state.activeCashierId || user?.role === 'admin';

  // Calculs financiers
  const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 0)), 0);
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
   * LOGIQUE DE DÉSTOCKAGE
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
            await supabase.rpc('deduire_stock', {
              item_id: ingredient.stock_id,
              qty_to_subtract: totalToDeduct
            });
          }
        }
      }
      return true;
    } catch (error) {
      console.error("Erreur déstockage:", error);
      return false;
    }
  };

  const handleValidation = async () => {
    if (cart.length === 0 || isProcessing) return;

    const actionText = isCaissierResponsable ? "Valider le paiement" : "Envoyer en cuisine";

    Alert.alert(
      "Confirmer l'action",
      `${actionText} pour un montant de ${formatPrice(total)} ?`,
      [
        { text: "Annuler", style: "cancel" },
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
              
              Alert.alert("Succès ✅", isCaissierResponsable ? "Vente encaissée !" : "Bon envoyé en cuisine !");
              router.replace('/'); 
            } catch (err: any) {
              Alert.alert("Erreur", err.message);
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
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.foreground }]}>Panier #{activeTab + 1}</Text>
          <TouchableOpacity 
            style={[styles.addMoreBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => router.push('/menu' as any)}
          >
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>+ Ajouter des plats</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.roleBadge, { backgroundColor: isCaissierResponsable ? '#dcfce7' : '#fff7ed' }]}>
            <Text style={{ color: isCaissierResponsable ? '#166534' : '#c2410c', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>
                {isCaissierResponsable ? "💳 Mode Encaisssement" : "📝 Mode Prise de Commande"}
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
                  {formatPrice(item.price)}
                </Text>
              </View>
              
              <View style={styles.controls}>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity, -1)}
                  style={[styles.btn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
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
            <View style={styles.emptyIconContainer}>
                <Text style={{ fontSize: 50 }}>🍲</Text>
            </View>
            <Text style={[styles.emptyText, { color: colors.foreground }]}>Votre panier est vide</Text>
            <Text style={{ color: colors.muted, textAlign: 'center', marginBottom: 30 }}>
              Commencez par sélectionner des plats dans le menu.
            </Text>
            
            <TouchableOpacity 
              onPress={() => router.push('/menu' as any)}
              style={[styles.mainMenuBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.mainMenuBtnText}>OUVRIR LE MENU</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Sous-total</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.muted, fontSize: 15 }}>Service (5%)</Text>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>{formatPrice(serviceCharge)}</Text>
          </View>
          
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalText, { color: colors.foreground }]}>TOTAL</Text>
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
                  {isCaissierResponsable ? "ENCAISSER MAINTENANT" : "ENVOYER EN CUISINE"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, paddingBottom: 20, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  addMoreBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  list: { paddingHorizontal: 25, paddingBottom: 40 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  itemPrice: { fontSize: 14, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 17, fontWeight: '900', minWidth: 25, textAlign: 'center' },
  footer: { padding: 25, borderTopWidth: 1, paddingBottom: 40, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -10}, shadowOpacity: 0.1, shadowRadius: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 15, borderTopWidth: 1.5 },
  totalText: { fontSize: 16, fontWeight: '900' },
  totalAmount: { fontSize: 26, fontWeight: '900' },
  submitBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 20, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  mainMenuBtn: { width: '100%', paddingVertical: 20, borderRadius: 15, alignItems: 'center' },
  mainMenuBtnText: { color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1 }
});