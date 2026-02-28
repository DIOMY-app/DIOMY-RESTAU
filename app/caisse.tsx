/**
 * CaisseScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/caisse.tsx
 * Correction : Résolution des erreurs de types TS (Retour aux propriétés définies dans types.ts)
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, FlatList, 
  Alert, StyleSheet, ActivityIndicator, RefreshControl, 
  Linking, Image 
} from 'react-native';

import { useApp } from '../app-context';
import { MenuItem } from '../types'; 
import { supabase } from '../supabase';
import { refreshAppData, deductStockFromOrder, sendToKitchen } from '../services/data-service'; 
import PinPadModal from '../components/PinPadModal';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';

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

  useEffect(() => {
    refreshAppData(dispatch);
  }, []);

  const onRefresh = () => refreshAppData(dispatch);

  // Correction Erreur : Utilisation de 'name' (type Category)
  const categories = ['Tous', ...state.categories.map(c => c.name)];
  
  // Correction Erreur : Utilisation de 'category' (type MenuItem)
  const filteredItems = state.menuItems.filter(item => {
    return selectedCategory === 'Tous' || item.category === selectedCategory;
  });
  
  const cartTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleAddItem = (item: MenuItem) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name, // Utilisation de 'name'
        price: item.price, // Utilisation de 'price'
        quantity: 1,
      },
    });
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity > 0) {
      // Correction Erreur : Utilisation de 'quantite' (selon ton dispatch action)
      dispatch({ type: 'UPDATE_CART_ITEM', payload: { id: itemId, quantite: quantity } });
    } else {
      dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
    }
  };

  const sendWhatsAppReceipt = (transactionId: string) => {
    const dateStr = new Date().toLocaleString('fr-FR');
    let message = `*🏔️ O'PIED DU MONT 🍴*\n_Korhogo_\n`;
    message += `--------------------------\n`;
    message += `*REÇU #${transactionId.toString().slice(-6).toUpperCase()}*\n`;
    message += `📅 ${dateStr}\n`;
    message += `💳 ${paymentMethod.toUpperCase()}\n`;
    message += `--------------------------\n\n`;

    state.cart.forEach(item => {
      message += `• ${item.quantity}x ${item.name} : ${formatPrice(item.price * item.quantity)}\n`;
    });

    message += `\n*TOTAL : ${formatPrice(cartTotal)}*\n`;
    message += `--------------------------\n`;
    message += `Merci de votre confiance !`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supp => {
      if (supp) Linking.openURL(url);
      else Alert.alert("Erreur", "WhatsApp n'est pas installé.");
    });
  };

  const processFinalOrder = async (employeeName: string) => {
    setIsPinVisible(false);
    setIsSubmitting(true);
    
    try {
      // Pour Supabase, on crée un objet compatible avec tes colonnes SQL
      const itemsForSql = state.cart.map(item => ({
        nom: item.name,
        quantite: item.quantity,
        prix_unitaire: item.price
      }));

      // 1. Enregistrement de la transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          montant_total: cartTotal,
          sous_total: cartTotal,
          mode_paiement: paymentMethod,
          items: itemsForSql, 
          caissier: employeeName,
          creee_a: new Date().toISOString(),
          payee_a: new Date().toISOString()
        }])
        .select().single();

      if (transactionError) throw transactionError;

      // 2. Mise à jour des stocks et cuisine 
      // Note : On passe 'state.cart' car ces services attendent le type 'CartItem'
      await Promise.allSettled([
        deductStockFromOrder(state.cart),
        sendToKitchen(transactionData.id, null, state.cart)
      ]);

      const tId = transactionData.id;
      dispatch({ type: 'CLEAR_CART' });
      
      Alert.alert(
        'Vente Validée ✅',
        `Transaction #${tId.toString().slice(-4)} réussie.`,
        [
          { text: 'OK', onPress: () => refreshAppData(dispatch) },
          { text: 'WhatsApp', onPress: () => {
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
        <View style={[styles.loaderOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: 'white', marginTop: 15, fontWeight: '700' }}>Traitement...</Text>
        </View>
      )}

      <PinPadModal 
        visible={isPinVisible}
        onClose={() => setIsPinVisible(false)}
        onSuccess={processFinalOrder}
      />

      <View style={styles.mainContainer}>
        <View style={styles.menuSection}>
          <View style={styles.headerRow}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoApp}
              resizeMode="contain"
            />
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>{RESTAURANT_INFO.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Korhogo • Caisse</Text>
            </View>
          </View>
          
          <View style={{ height: 60 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryBadge, { 
                    backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                    borderColor: selectedCategory === cat ? colors.primary : colors.border 
                  }]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={{ 
                      color: selectedCategory === cat ? 'white' : colors.foreground, 
                      fontWeight: '700' 
                  }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={item => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
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
              <Text style={[styles.emptyText, { color: colors.muted, marginTop: 40 }]}>Aucun article.</Text>
            }
          />
        </View>

        <View style={[styles.cartSidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cartHeader}>
            <Text style={[styles.cartTitle, { color: colors.foreground }]}>Panier</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_CART' })}>
                <Text style={{ color: '#ef4444', fontWeight: '700' }}>Vider</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {state.cart.length === 0 ? (
                <View style={styles.emptyCartContainer}>
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Panier vide</Text>
                </View>
            ) : (
                state.cart.map(item => (
                    <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                      <Text style={{ color: colors.foreground, fontWeight: '700' }}>{item.name}</Text>
                      <View style={styles.cartItemFooter}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.border }]} 
                            onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Text style={{ color: colors.foreground }}>−</Text>
                          </TouchableOpacity>
                          <Text style={{ color: colors.foreground, width: 20, textAlign: 'center', fontWeight: '800' }}>{item.quantity}</Text>
                          <TouchableOpacity 
                            style={[styles.qtyBtn, { backgroundColor: colors.primary }]} 
                            onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Text style={{ color: 'white' }}>+</Text>
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
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>TOTAL</Text>
              <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900' }}>{formatPrice(cartTotal)}</Text>
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
                        borderWidth: 1.5
                    }
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={{ 
                    color: paymentMethod === m ? 'white' : colors.foreground, 
                    fontSize: 9, 
                    fontWeight: '800' 
                  }}>{m.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.validateBtn, 
                { 
                    backgroundColor: '#22c55e', 
                    opacity: (isSubmitting || state.cart.length === 0) ? 0.5 : 1 
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
  screen: { flex: 1, padding: 16, paddingTop: 40 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000, borderRadius: 20 },
  mainContainer: { flex: 1, flexDirection: 'row', gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoApp: { width: 50, height: 50, borderRadius: 14 },
  menuSection: { flex: 1 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  categoryList: { gap: 10, paddingVertical: 10 },
  categoryBadge: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  menuItemCard: { flex: 0.5, borderRadius: 18, padding: 16, borderWidth: 1.5, marginBottom: 12, justifyContent: 'space-between', height: 110, elevation: 2 },
  menuItemName: { fontWeight: '800', fontSize: 15, lineHeight: 20 },
  cartSidebar: { width: 330, borderRadius: 28, borderWidth: 1.5, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cartTitle: { fontSize: 22, fontWeight: '900' },
  emptyCartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
  cartItem: { paddingVertical: 14, borderBottomWidth: 1 },
  cartItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  paymentBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  validateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 3 }
});