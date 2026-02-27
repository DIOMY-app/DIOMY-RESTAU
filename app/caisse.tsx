/**
 * CaisseScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/caisse.tsx
 * Version Finale : Optimisée pour tablette/mobile avec gestion de stock et WhatsApp
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, FlatList, 
  Alert, StyleSheet, ActivityIndicator, RefreshControl, 
  Linking, Image 
} from 'react-native';

// @ts-ignore
import { useApp } from '../app-context';
import { MenuItem } from '../types'; 
import { supabase } from '../supabase';
import { refreshAppData, deductStockFromOrder, sendToKitchen } from '../services/data-service'; 
import PinPadModal from '../components/PinPadModal';
// @ts-ignore
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';

// Configuration Restaurant
const RESTAURANT_INFO = {
  name: "O'PIED DU MONT",
  location: "Korhogo, Quartier Résidentiel",
  phone: "+225 07 07 00 00 00",
  whatsapp: "2250707000000",
};

type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'carte';

export default function CaisseScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');

  // Chargement initial des données
  useEffect(() => {
    refreshAppData(dispatch);
  }, []);

  const onRefresh = () => refreshAppData(dispatch);

  // Sécurité sur les catégories
  const categories = ['Tous', ...state.categories.map(c => c.name)];
  
  // Filtrage du menu
  const filteredItems = state.menuItems.filter(item => {
    return selectedCategory === 'Tous' || item.category === selectedCategory;
  });
  
  const cartTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = (item: MenuItem) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: `${item.id}-${Date.now()}`, // ID unique pour le panier
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
   * Génère un reçu formaté professionnel pour WhatsApp
   */
  const sendWhatsAppReceipt = (transactionId: string) => {
    const dateStr = new Date().toLocaleString('fr-FR');
    
    let message = `*🏔️ O'PIED DU MONT 🍴*\n`;
    message += `_Restaurant - Korhogo_\n`;
    message += `------------------------------------------\n`;
    message += `*REÇU DE CAISSE*\n`;
    message += `📅 Date : ${dateStr}\n`;
    message += `🔢 Ticket : #${transactionId.toString().slice(-6).toUpperCase()}\n`;
    message += `💳 Paiement : ${paymentMethod.toUpperCase()}\n`;
    message += `------------------------------------------\n\n`;

    state.cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name}\n  => ${formatPrice(item.price * item.quantity)}\n`;
    });

    message += `\n*TOTAL : ${formatPrice(cartTotal)}*\n`;
    message += `------------------------------------------\n`;
    message += `✨ Merci de votre visite ! ✨`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert("Erreur", "WhatsApp n'est pas installé.");
    });
  };

  /**
   * Action finale après validation du PIN
   */
  const processFinalOrder = async (employeeName: string) => {
    setIsPinVisible(false);
    setIsSubmitting(true);
    
    try {
      // 1. Enregistrement de la transaction
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

      // 2. Mise à jour des stocks et envoi cuisine en parallèle
      await Promise.all([
        deductStockFromOrder(state.cart),
        sendToKitchen(transactionData.id, null, state.cart)
      ]);

      const tId = transactionData.id;
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Vente Validée ✅',
        `Merci ${employeeName}. Transaction #${tId.toString().slice(-4)} réussie.`,
        [
          { text: 'OK', onPress: () => refreshAppData(dispatch) },
          { text: 'WhatsApp', onPress: () => {
              sendWhatsAppReceipt(tId);
              refreshAppData(dispatch);
          }}
        ]
      );

    } catch (error: any) {
      Alert.alert('Erreur Critique', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {(state.isLoading || isSubmitting) && (
        <View style={[styles.loaderOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: 'white', marginTop: 10 }}>Traitement...</Text>
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
              <Text style={[styles.title, { color: colors.foreground }]}>{RESTAURANT_INFO.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{RESTAURANT_INFO.location}</Text>
            </View>
          </View>
          
          <View style={{ height: 50, marginBottom: 16 }}>
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
                    <Text style={{ 
                        color: selectedCategory === cat ? colors.background : colors.foreground, 
                        fontWeight: '700' 
                    }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            refreshControl={<RefreshControl refreshing={state.isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.menuItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => handleAddItem(item)}
              >
                <Text style={[styles.menuItemName, { color: colors.foreground }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>
                  {formatPrice(item.price)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.muted }]}>Aucun article dans cette catégorie.</Text>
            }
          />
        </View>

        {/* SECTION DROITE : PANIER */}
        <View style={[styles.cartSidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cartHeader}>
            <Text style={[styles.cartTitle, { color: colors.foreground }]}>Panier Actuel</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_CART' })}>
                <Text style={{ color: colors.error, fontWeight: '600' }}>Vider</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {state.cart.length === 0 ? (
                <View style={styles.emptyCartContainer}>
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Votre panier est vide</Text>
                </View>
            ) : (
                state.cart.map(item => (
                    <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                      <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>{item.name}</Text>
                      <View style={styles.cartItemFooter}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.border }]} 
                            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: colors.foreground, width: 25, textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</Text>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.primary }]} 
                            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Text style={{ color: colors.background, fontWeight: 'bold' }}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{formatPrice(item.price * item.quantity)}</Text>
                      </View>
                    </View>
                ))
            )}
          </ScrollView>

          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '800' }}>TOTAL</Text>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '900' }}>{formatPrice(cartTotal)}</Text>
            </View>

            <View style={styles.paymentGrid}>
              {(['especes', 'wave', 'orange_money', 'carte'] as PaymentMethod[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.paymentBtn, 
                    { 
                        backgroundColor: paymentMethod === m ? colors.primary : colors.background,
                        borderColor: paymentMethod === m ? colors.primary : colors.border,
                        borderWidth: 1
                    }
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={{ 
                    color: paymentMethod === m ? colors.background : colors.foreground, 
                    fontSize: 10, 
                    fontWeight: 'bold' 
                  }}>{m.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.validateBtn, 
                { 
                    backgroundColor: colors.success, 
                    opacity: (isSubmitting || state.cart.length === 0) ? 0.6 : 1 
                }
              ]}
              onPress={() => { if(state.cart.length > 0) setIsPinVisible(true); }}
              disabled={isSubmitting || state.cart.length === 0}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>VALIDER LA VENTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, paddingTop: 50 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  mainContainer: { flex: 1, flexDirection: 'row', gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoApp: { width: 45, height: 45, borderRadius: 12 },
  menuSection: { flex: 1 },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  categoryList: { flexDirection: 'row', gap: 10, paddingRight: 20 },
  categoryBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  menuItemCard: { flex: 0.5, borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12, justifyContent: 'space-between', height: 100 },
  menuItemName: { fontWeight: '700', fontSize: 14, lineHeight: 18 },
  cartSidebar: { width: 320, borderRadius: 24, borderWidth: 1, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cartTitle: { fontSize: 20, fontWeight: '800' },
  emptyCartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '500' },
  cartItem: { paddingVertical: 12, borderBottomWidth: 1 },
  cartItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentBtn: { flex: 1, minWidth: '45%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  validateBtn: { paddingVertical: 20, borderRadius: 16, alignItems: 'center', elevation: 2 }
});