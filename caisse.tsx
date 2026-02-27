/**
 * CaisseScreen - O'PIED DU MONT Mobile
 * Version avec Contacts par défaut et intégration Logo
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator, RefreshControl, Linking, Image } from 'react-native';
import { useApp } from './app-context';
import { MenuItem } from './types';
import { supabase } from './supabase';
import { refreshAppData, deductStockFromOrder, sendToKitchen } from './services/data-service'; 
import PinPadModal from './components/PinPadModal';

// --- UTILITAIRES ---
let useColors: any = () => ({ primary: '#EAB308', surface: '#FFFFFF', border: '#E2E8F0', foreground: '#0F172A', background: '#FFFFFF' });
let formatPrice: any = (p: number) => `${p} FCFA`;
try {
  useColors = require('./hooks/use-colors').useColors;
  formatPrice = require('./lib/formatting').formatPrice;
} catch (e) {}

// Configuration Restaurant (Contacts modifiés par défaut)
const RESTAURANT_INFO = {
  name: "O'PIED DU MONT",
  location: "Korhogo, Quartier Résidentiel",
  phone: "+225 07 07 00 00 00", // Numéro formaté pour l'affichage
  whatsapp: "2250707000000",     // Numéro pour le lien direct
  email: "contact@opieddumont.ci"
};

export default function CaisseScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'wave' | 'orange_money' | 'carte'>('especes');

  useEffect(() => {
    refreshAppData(dispatch);
  }, []);

  const onRefresh = () => {
    refreshAppData(dispatch);
  };

  const categories = ['Tous', ...state.categories.map(c => c.name)];
  const filteredItems = state.menuItems.filter(item => 
    selectedCategory === 'Tous' || item.category === selectedCategory
  );
  const cartTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = (item: MenuItem) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      },
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { id: itemId, quantite: quantity } });
    } else {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    }
  };

  /**
   * GÉNÉRATION DU REÇU WHATSAPP AVEC LOGO TEXTUEL
   */
  const sendWhatsAppReceipt = (transactionId: string) => {
    const dateStr = new Date().toLocaleString('fr-FR');
    
    let message = `*🏔️ O'PIED DU MONT 🍴*\n`;
    message += `_Restaurant - Korhogo_\n`;
    message += `------------------------------------------\n`;
    message += `*REÇU DE CAISSE*\n`;
    message += `📅 Date : ${dateStr}\n`;
    message += `🔢 Ticket : #${transactionId.slice(-6).toUpperCase()}\n`;
    message += `👤 Serveur : ${state.user?.name || 'Équipe OPM'}\n`;
    message += `💳 Paiement : ${paymentMethod.toUpperCase()}\n`;
    message += `------------------------------------------\n\n`;

    state.cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name}\n  => ${formatPrice(item.price * item.quantity)}\n`;
    });

    message += `\n*TOTAL À PAYER : ${formatPrice(cartTotal)}*\n`;
    message += `------------------------------------------\n`;
    message += `📍 ${RESTAURANT_INFO.location}\n`;
    message += `📞 Contact : ${RESTAURANT_INFO.phone}\n`;
    message += `✨ Merci de votre fidélité ! ✨`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Erreur", "L'application WhatsApp n'est pas installée.");
      }
    });
  };

  const processFinalOrder = async (employeeName: string) => {
    setIsPinVisible(false);
    setIsSubmitting(true);
    
    try {
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          montant_total: cartTotal,
          sous_total: cartTotal,
          mode_paiement: paymentMethod,
          items: state.cart,
          caissier: employeeName,
          creee_a: new Date().toISOString(),
          payee_a: new Date().toISOString()
        }])
        .select().single();

      if (transactionError) throw transactionError;

      await deductStockFromOrder(state.cart);
      await sendToKitchen(transactionData.id, null, state.cart);

      const tId = transactionData.id;
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Vente Validée',
        'La transaction a été enregistrée. Envoyer le reçu ?',
        [
          { text: 'Non', onPress: () => refreshAppData(dispatch) },
          { text: 'OUI (WhatsApp)', onPress: () => {
              sendWhatsAppReceipt(tId);
              refreshAppData(dispatch);
          }}
        ]
      );

    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {(state.isLoading || isSubmitting) && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <PinPadModal 
        visible={isPinVisible}
        onClose={() => setIsPinVisible(false)}
        onSuccess={processFinalOrder}
      />

      <View style={styles.mainContainer}>
        {/* SECTION GAUCHE : MENU */}
        <View style={styles.menuSection}>
          <View style={styles.headerRow}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoApp}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>O'PIED DU MONT</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{RESTAURANT_INFO.location}</Text>
            </View>
          </View>
          
          <View style={{ maxHeight: 50, marginBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryList}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBadge, { 
                      backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                      borderColor: colors.border 
                    }]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={{ color: selectedCategory === cat ? colors.background : colors.foreground, fontWeight: '600' }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 8 }}
            refreshControl={<RefreshControl refreshing={state.isLoading} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleAddItem(item)}
              >
                <Text style={[styles.menuItemName, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{formatPrice(item.price)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* SECTION DROITE : PANIER */}
        <View style={[styles.cartSidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cartTitle, { color: colors.foreground }]}>Panier</Text>
          <ScrollView style={{ flex: 1 }}>
            {state.cart.length === 0 ? (
                <Text style={styles.emptyText}>Sélectionnez des produits</Text>
            ) : (
                state.cart.map(item => (
                    <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>{item.name}</Text>
                      <View style={styles.cartItemFooter}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.border }]} onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}>
                            <Text style={{ color: colors.foreground }}>−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: colors.foreground, width: 20, textAlign: 'center' }}>{item.quantity}</Text>
                          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.primary }]} onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}>
                            <Text style={{ color: colors.background }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>{formatPrice(item.price * item.quantity)}</Text>
                      </View>
                    </View>
                ))
            )}
          </ScrollView>

          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: 'bold' }}>Total</Text>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>{formatPrice(cartTotal)}</Text>
            </View>

            <View style={styles.paymentGrid}>
              {['especes', 'wave', 'orange_money', 'carte'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.paymentBtn, { backgroundColor: paymentMethod === m ? colors.primary : colors.border }]}
                  onPress={() => setPaymentMethod(m as any)}
                >
                  <Text style={{ color: paymentMethod === m ? colors.background : colors.foreground, fontSize: 8, fontWeight: 'bold' }}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.validateBtn, { backgroundColor: colors.primary, opacity: (isSubmitting || state.cart.length === 0) ? 0.7 : 1 }]}
              onPress={() => { if(state.cart.length > 0) setIsPinVisible(true); }}
              disabled={isSubmitting || state.cart.length === 0}
            >
              {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={{ color: colors.background, fontWeight: 'bold' }}>VALIDER LA VENTE</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 40 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  mainContainer: { flex: 1, flexDirection: 'row', gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 15 },
  logoApp: { width: 50, height: 50, borderRadius: 8 },
  menuSection: { flex: 1 },
  title: { fontSize: 20, fontWeight: 'bold' },
  categoryList: { flexDirection: 'row', gap: 8 },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  menuItemCard: { flex: 1, borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 8 },
  menuItemName: { fontWeight: '600', marginBottom: 4, fontSize: 13 },
  cartSidebar: { width: 300, borderRadius: 12, borderWidth: 1, padding: 16 },
  cartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40, fontSize: 14 },
  cartItem: { paddingVertical: 10, borderBottomWidth: 1 },
  cartItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  totalSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  paymentBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  validateBtn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center' }
});