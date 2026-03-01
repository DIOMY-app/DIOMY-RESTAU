/**
 * Checkout Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/checkout.tsx
 * Version : Enregistrement client + Reçu WhatsApp + Sync Totaux
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

  // Synchronisation des calculs avec la logique globale
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const serviceCharge = subtotal * 0.05; // On garde le même taux que dans orders.tsx
  const total = subtotal + serviceCharge;

  const validateOrder = async () => {
    // Règle n°1 : Validation des entrées
    if (!customerName || !phoneNumber) {
      Alert.alert("Champs manquants", "Veuillez remplir le nom et le numéro WhatsApp du client.");
      return;
    }

    if (phoneNumber.length !== 10) {
      Alert.alert("Numéro invalide", "Le numéro doit comporter 10 chiffres (Côte d'Ivoire).");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Enregistrement/Mise à jour du client
      const { data: customer, error: custError } = await supabase
        .from('clients')
        .upsert({ 
          nom: customerName, 
          telephone: phoneNumber,
          derniere_visite: new Date().toISOString()
        }, { onConflict: 'telephone' })
        .select()
        .single();

      if (custError) throw custError;

      // 2. Enregistrement de la commande en base
      const { error: orderError } = await supabase
        .from('commandes')
        .insert({
          client_id: customer.id,
          total: total,
          articles: state.cart, 
          statut: 'complete',
          service_charge: serviceCharge // On stocke les frais séparément pour la compta
        });

      if (orderError) throw orderError;

      // 3. Construction du message WhatsApp élégant
      const itemsList = state.cart
        .map((item) => `• ${item.quantity}x ${item.name} : ${formatPrice(item.price * item.quantity)}`)
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

      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?phone=225${phoneNumber}&text=${encodedMsg}`;

      // 4. Dialogue de fin
      Alert.alert(
        "Vente terminée",
        "Le client et la commande ont été enregistrés.",
        [
          { 
            text: "Ignorer le reçu", 
            onPress: () => {
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/'); 
            }
          },
          { 
            text: "Envoyer WhatsApp", 
            onPress: async () => {
              const supported = await Linking.canOpenURL(whatsappUrl);
              if (supported) {
                await Linking.openURL(whatsappUrl);
              } else {
                Alert.alert("Erreur", "L'application WhatsApp n'est pas installée sur ce téléphone.");
              }
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/');
            }
          }
        ]
      );

    } catch (error: any) {
      console.error(error);
      Alert.alert("Erreur technique", "Une erreur est survenue lors de l'enregistrement : " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Finalisation</Text>
          <Text style={{ color: colors.muted }}>Enregistrement du reçu client</Text>
        </View>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NOM DU CLIENT</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            placeholder="Ex: M. Jean"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted, marginTop: 20 }]}>MOBILE (WHATSAPP)</Text>
          <View style={[styles.phoneWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.prefix, { color: colors.muted }]}>+225 </Text>
            <TextInput
              style={[styles.phoneInput, { color: colors.foreground }]}
              placeholder="01 02 03 04 05"
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
            <Text style={{ color: colors.muted }}>Service :</Text>
            <Text style={{ color: colors.foreground }}>{formatPrice(serviceCharge)}</Text>
          </View>
          <View style={[styles.summaryLine, styles.totalLine]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total net</Text>
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
          <Text style={{ color: colors.muted, fontWeight: '600' }}>Modifier la commande</Text>
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
  totalLine: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
  totalLabel: { fontSize: 20, fontWeight: '900' },
  totalAmount: { fontSize: 28, fontWeight: '900' },
  submitBtn: { height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  backBtn: { marginTop: 25, alignItems: 'center', padding: 10 }
});