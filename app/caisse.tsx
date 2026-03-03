/**
 * CaisseScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/caisse.tsx
 * Version Intégrale : Gestion Caissière Active + Multi-Clients + WhatsApp Automatique + Fidélité
 */

import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, FlatList, 
  Alert, StyleSheet, ActivityIndicator, 
  Linking, Image, TextInput 
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
  phone: "+225 07 99 60 83 49", // Numéro mis à jour selon votre demande
};

type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'carte';

export default function CaisseScreen() {
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);
  const [isSwitchingCashier, setIsSwitchingCashier] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [clientPhone, setClientPhone] = useState('');

  // Logique de responsabilité
  const activeCashierId = state.activeCashierId;
  const isUserResponsible = state.user?.id === activeCashierId;
  const activeCashierName = state.employees.find(e => e.id === activeCashierId)?.nom || "Aucune";

  // Gestion Multi-Paniers
  const activeTab = state.activeTab ?? 0;
  const currentCart = state.carts[activeTab] || [];

  useEffect(() => {
    refreshAppData(dispatch);
  }, []);

  const categories = ['Tous', ...state.categories.map(c => c.name)];
  
  const filteredItems = state.menuItems.filter(item => {
    return selectedCategory === 'Tous' || item.category === selectedCategory;
  });
  
  const cartTotal = currentCart.reduce((sum, item) => {
    const price = item.price || 0;
    const qty = item.quantity || 0;
    return sum + (price * qty);
  }, 0);

  const safeFormatPrice = (val: number) => {
    try {
      return formatPrice(val);
    } catch (e) {
      return `${val} FCFA`;
    }
  };

  const handleSwitchCashier = (employeeName: string) => {
    const employee = state.employees.find(e => e.nom === employeeName);
    if (employee) {
      dispatch({ type: 'SWITCH_CASHIER', payload: employee.id });
      setIsSwitchingCashier(false);
      Alert.alert("Succès", `${employeeName} est maintenant garante de la caisse.`);
    }
  };

  const handleAddItem = (item: MenuItem) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: `${item.id}-${Date.now()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price || 0,
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

  const handleSimpleSendToKitchen = async () => {
    setIsSubmitting(true);
    try {
      await sendToKitchen(0, 0, currentCart);
      Alert.alert("Transmis 👨‍🍳", "La commande a été envoyée en cuisine. La caissière pourra valider le paiement.");
      dispatch({ type: 'CLEAR_CART' });
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction d'envoi WhatsApp
  const sendWhatsAppReceipt = (transactionId: string | number, phone: string, items: any[], total: number) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const safeId = transactionId ? transactionId.toString().slice(-6).toUpperCase() : '000000';

    let message = `*🏔️ O'PIED DU MONT 🍴*\n_L'excellence à Korhogo_\n`;
    message += `--------------------------\n`;
    message += `*REÇU DE PAIEMENT #${safeId}*\n`;
    message += `📅 ${dateStr}\n`;
    message += `💳 PAIEMENT : ${paymentMethod.toUpperCase()}\n`;
    message += `--------------------------\n\n`;

    items.forEach(item => {
      message += `• ${item.quantity}x ${item.name} : ${safeFormatPrice(item.price * item.quantity)}\n`;
    });

    message += `\n*TOTAL : ${safeFormatPrice(total)}*\n`;
    message += `--------------------------\n`;
    message += `Merci de votre confiance ! À bientôt.`;

    const cleanPhone = phone.replace(/\s/g, '');
    const url = cleanPhone.length >= 8 
      ? `whatsapp://send?phone=225${cleanPhone}&text=${encodeURIComponent(message)}`
      : `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supp => {
      if (supp) Linking.openURL(url);
      else Alert.alert("Erreur", "WhatsApp n'est pas installé.");
    });
  };

  const processFinalOrder = async (employeeName: string) => {
    setIsPinVisible(false);
    setIsSubmitting(true);
    
    // Sauvegarde des données locales pour le WhatsApp (car le dispatch vide le panier)
    const itemsForReceipt = [...currentCart];
    const totalForReceipt = cartTotal;
    const phoneToUse = clientPhone;

    try {
      const itemsForSql = currentCart.map(item => ({
        nom: item.name,
        quantite: item.quantity,
        prix_unitaire: item.price
      }));

      let linkedClientId = null;
      if (phoneToUse.trim().length >= 8) {
        const cleanPhone = phoneToUse.replace(/\s/g, '');

        // Recherche client pour mise à jour stats
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id, total_depense, nombre_visites')
          .eq('telephone', cleanPhone)
          .single();

        if (existingClient) {
          const { data: updatedClient } = await supabase
            .from('clients')
            .update({ 
              derniere_visite: new Date().toISOString(),
              total_depense: (existingClient.total_depense || 0) + totalForReceipt,
              nombre_visites: (existingClient.nombre_visites || 0) + 1
            })
            .eq('id', existingClient.id)
            .select('id').single();
          if (updatedClient) linkedClientId = updatedClient.id;
        } else {
          // Création si nouveau
          const { data: newClient } = await supabase
            .from('clients')
            .insert([{ 
              telephone: cleanPhone, 
              derniere_visite: new Date().toISOString(),
              nom: 'Client Passager',
              total_depense: totalForReceipt,
              nombre_visites: 1
            }])
            .select('id').single();
          if (newClient) linkedClientId = newClient.id;
        }
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          montant_total: totalForReceipt,
          sous_total: totalForReceipt,
          mode_paiement: paymentMethod,
          items: itemsForSql, 
          caissier: employeeName,
          client_contact: phoneToUse, 
          client_id: linkedClientId,
          creee_a: new Date().toISOString(),
          payee_a: new Date().toISOString()
        }])
        .select().single();

      if (transactionError) throw transactionError;

      await Promise.allSettled([
        deductStockFromOrder(itemsForReceipt),
        sendToKitchen(transactionData.id, 0, itemsForReceipt)
      ]);

      const tId = transactionData.id;
      
      // Nettoyage de l'interface
      dispatch({ type: 'CLEAR_CART' });
      setClientPhone('');
      refreshAppData(dispatch);
      
      // AUTOMATISATION : Envoi immédiat si numéro présent
      if (phoneToUse.trim().length >= 8) {
        sendWhatsAppReceipt(tId, phoneToUse, itemsForReceipt, totalForReceipt);
      } else {
        Alert.alert('Vente Validée ✅', `Transaction #${tId.toString().slice(-4)} réussie.`);
      }

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

      <PinPadModal 
        visible={isSwitchingCashier}
        onClose={() => setIsSwitchingCashier(false)}
        onSuccess={handleSwitchCashier}
      />

      <View style={styles.mainContainer}>
        {/* SECTION GAUCHE : MENU */}
        <View style={styles.menuSection}>
          <View style={styles.headerRow}>
            <Image source={require('../assets/logo.png')} style={styles.logoApp} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>{RESTAURANT_INFO.name}</Text>
              <View style={styles.cashierBadge}>
                 <Text style={{ color: colors.muted, fontSize: 12 }}>Garante : </Text>
                 <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>{activeCashierName}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.switchBtn, { borderColor: colors.primary }]}
              onPress={() => setIsSwitchingCashier(true)}
            >
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>PRENDRE LA CAISSE</Text>
            </TouchableOpacity>
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
                  <Text style={{ color: selectedCategory === cat ? 'white' : colors.foreground, fontWeight: '700' }}>{cat}</Text>
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
                  {safeFormatPrice(item.price)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.muted, marginTop: 40 }]}>Aucun article.</Text>}
          />
        </View>

        {/* SECTION DROITE : PANIER MULTI-CLIENTS */}
        <View style={[styles.cartSidebar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          
          <View style={styles.tabContainer}>
            {[0, 1, 2].map(idx => (
              <TouchableOpacity
                key={idx}
                onPress={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: idx })}
                style={[
                  styles.tabButton,
                  activeTab === idx ? { backgroundColor: colors.primary } : { backgroundColor: colors.background },
                  state.carts[idx]?.length > 0 && activeTab !== idx && { borderBottomColor: '#ef4444', borderBottomWidth: 4 }
                ]}
              >
                <Text style={[styles.tabLabel, { color: activeTab === idx ? 'white' : colors.foreground }]}>
                  C{idx + 1}
                </Text>
                {state.carts[idx]?.length > 0 && <View style={styles.activityDot} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cartHeader}>
            <Text style={[styles.cartTitle, { color: colors.foreground }]}>Panier Client {activeTab + 1}</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'CLEAR_CART' })}>
                <Text style={{ color: '#ef4444', fontWeight: '700' }}>Vider</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {currentCart.length === 0 ? (
                <View style={styles.emptyCartContainer}>
                    <Text style={[styles.emptyText, { color: colors.muted }]}>Panier vide</Text>
                </View>
            ) : (
                currentCart.map(item => (
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
                        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{safeFormatPrice(item.price * item.quantity)}</Text>
                      </View>
                    </View>
                ))
            )}
          </ScrollView>

          <View style={styles.marketingContainer}>
            <Text style={[styles.marketingLabel, { color: colors.muted }]}>CONTACT CLIENT (WHATSAPP AUTO)</Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Ex: 0708091011"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={clientPhone}
              onChangeText={setClientPhone}
            />
          </View>

          <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
            <View style={styles.totalRow}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>TOTAL</Text>
              <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900' }}>{safeFormatPrice(cartTotal)}</Text>
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
                        borderWidth: 1.5,
                        opacity: isUserResponsible ? 1 : 0.5
                    }
                  ]}
                  onPress={() => isUserResponsible && setPaymentMethod(m)}
                >
                  <Text style={{ 
                    color: paymentMethod === m ? 'white' : colors.foreground, 
                    fontSize: 8, 
                    fontWeight: '800' 
                  }}>{m.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {isUserResponsible ? (
              <TouchableOpacity
                style={[styles.validateBtn, { backgroundColor: '#22c55e', opacity: (isSubmitting || currentCart.length === 0) ? 0.5 : 1 }]}
                onPress={() => { if(currentCart.length > 0) setIsPinVisible(true); }}
                disabled={isSubmitting || currentCart.length === 0}
              >
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>VALIDER PAIEMENT</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.validateBtn, { backgroundColor: '#3b82f6', opacity: (isSubmitting || currentCart.length === 0) ? 0.5 : 1 }]}
                onPress={() => { if(currentCart.length > 0) handleSimpleSendToKitchen(); }}
                disabled={isSubmitting || currentCart.length === 0}
              >
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>ENVOYER EN CUISINE</Text>
              </TouchableOpacity>
            )}
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
  cashierBadge: { flexDirection: 'row', alignItems: 'center' },
  switchBtn: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  categoryList: { gap: 10, paddingVertical: 10 },
  categoryBadge: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center' },
  menuItemCard: { flex: 0.5, borderRadius: 18, padding: 16, borderWidth: 1.5, marginBottom: 12, justifyContent: 'space-between', height: 110, elevation: 2 },
  menuItemName: { fontWeight: '800', fontSize: 15, lineHeight: 20 },
  cartSidebar: { width: 330, borderRadius: 28, borderWidth: 1.5, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  tabContainer: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  tabButton: { flex: 1, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tabLabel: { fontWeight: '900', fontSize: 14 },
  activityDot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cartTitle: { fontSize: 19, fontWeight: '900' },
  emptyCartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '600' },
  cartItem: { paddingVertical: 14, borderBottomWidth: 1 },
  cartItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  marketingContainer: { marginBottom: 15, marginTop: 10 },
  marketingLabel: { fontSize: 9, fontWeight: '900', marginBottom: 5 },
  phoneInput: { height: 45, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, fontWeight: '700' },
  totalSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  paymentBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  validateBtn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 3 }
});