/**
 * Checkout Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/checkout.tsx
 * Version : 1.3 - Correction stricte des types CartItem (Sync English properties)
 */

import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, Linking, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Correction des propriétés pour correspondre au type CartItem (name, price, quantity)
  const subtotal = state.cart.reduce((sum, item) => {
    const p = item.price || 0;
    const q = item.quantity || 0;
    return sum + (p * q);
  }, 0);

  const serviceCharge = subtotal * 0.05; 
  const total = subtotal + serviceCharge;

  const validateOrder = async () => {
    if (!customerName || !phoneNumber) {
      Alert.alert("Champs manquants", "Veuillez remplir le nom et le numéro WhatsApp.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      Alert.alert("Numéro invalide", "Veuillez entrer un numéro de téléphone valide.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Mise à jour automatique de la 'derniere_visite' du client
      const { data: customer, error: custError } = await supabase
        .from('clients')
        .upsert({ 
          nom: customerName, 
          telephone: cleanPhone,
          derniere_visite: new Date().toISOString(),
          actif: true
        }, { onConflict: 'telephone' })
        .select()
        .single();

      if (custError) throw custError;

      // 2. Préparation des items avec les propriétés détectées dans ton interface
      const itemsForSql = state.cart.map(item => ({
        nom: item.name || 'Produit sans nom',
        quantite: item.quantity || 1,
        prix_unitaire: item.price || 0
      }));

      // 3. Enregistrement Transaction
      const { data: transaction, error: transError } = await supabase
        .from('transactions')
        .insert({
          client_id: customer.id,
          client_contact: cleanPhone,
          montant_total: total,
          sous_total: subtotal,
          items: itemsForSql,
          mode_paiement: 'especes',
          caissier: state.user?.nom || 'Vente Directe',
          creee_a: new Date().toISOString()
        })
        .select()
        .single();

      if (transError) throw transError;

      // 4. Reçu WhatsApp
      const itemsList = state.cart
        .map((item) => `• ${item.quantity}x ${item.name} : ${formatPrice((item.price || 0) * (item.quantity || 0))}`)
        .join('\n');

      const message = 
        `*🏔️ O'PIED DU MONT 🍴*\n` +
        `------------------------------------------\n` +
        `Merci pour votre visite *${customerName}* !\n\n` +
        `*DÉTAILS DU REÇU :*\n` +
        `${itemsList}\n` +
        `------------------------------------------\n` +
        `Sous-total : ${formatPrice(subtotal)}\n` +
        `Service (5%) : ${formatPrice(serviceCharge)}\n` +
        `*TOTAL : ${formatPrice(total)}*\n\n` +
        `_Au plaisir de vous revoir bientôt ! ✨_`;

      const whatsappUrl = `whatsapp://send?phone=225${cleanPhone}&text=${encodeURIComponent(message)}`;

      Alert.alert(
        "Vente enregistrée ✅",
        `Transaction #${transaction.id.toString().slice(-4)} réussie.`,
        [
          { 
            text: "Terminer", 
            onPress: () => {
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/'); 
            }
          },
          { 
            text: "Envoyer le Reçu", 
            style: "default",
            onPress: async () => {
              const supported = await Linking.canOpenURL(whatsappUrl);
              if (supported) {
                await Linking.openURL(whatsappUrl);
              }
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error("Erreur Checkout:", error.message);
      Alert.alert("Erreur", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Paiement</Text>
          <Text style={{ color: colors.muted }}>Client : {customerName || '...'}</Text>
        </View>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NOM DU CLIENT</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            placeholder="Ex: M. Diomande"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>WHATSAPP (SANS +225)</Text>
          <View style={[styles.phoneWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.prefix, { color: colors.muted }]}>+225 </Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="0701020304"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryLine}>
            <Text style={{ color: colors.muted }}>Articles :</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryLine}>
            <Text style={{ color: colors.muted }}>Service (5%) :</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(serviceCharge)}</Text>
          </View>
          <View style={[styles.summaryLine, styles.totalLine, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total Net</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isProcessing ? 0.7 : 1 }]}
          onPress={validateOrder}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>VALIDER LA VENTE</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>Modifier le panier</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25 },
  header: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 25 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, fontWeight: '600' },
  phoneWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 15 },
  prefix: { fontSize: 16, fontWeight: 'bold' },
  phoneInput: { flex: 1, height: 55, fontSize: 18, fontWeight: '700' },
  summaryContainer: { marginBottom: 40, paddingHorizontal: 5 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalLine: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
  totalLabel: { fontSize: 20, fontWeight: '900' },
  totalAmount: { fontSize: 28, fontWeight: '900' },
  submitBtn: { height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  backBtn: { marginTop: 25, alignItems: 'center', padding: 10 }
});