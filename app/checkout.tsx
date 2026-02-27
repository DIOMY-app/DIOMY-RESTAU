/**
 * Checkout Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/checkout.tsx
 * Enregistrement client et envoi du reçu WhatsApp
 */

import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, Linking, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';

// Imports corrigés
import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatPrice } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';

// Interface locale pour le typage strict des items du panier
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, dispatch } = useApp();
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Calcul des totaux depuis le state global
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const validateOrder = async () => {
    if (!customerName || !phoneNumber) {
      Alert.alert("Champs manquants", "Veuillez remplir le nom et le numéro WhatsApp du client.");
      return;
    }

    // Validation simple du numéro ivoirien (10 chiffres)
    if (phoneNumber.length !== 10) {
      Alert.alert("Numéro invalide", "Le numéro doit comporter 10 chiffres.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Enregistrement/Mise à jour du client dans Supabase
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

      // 2. Enregistrement de la commande
      const { error: orderError } = await supabase
        .from('commandes')
        .insert({
          client_id: customer.id,
          total: total,
          articles: state.cart, 
          statut: 'complete'
        });

      if (orderError) throw orderError;

      // 3. Préparation du message WhatsApp
      const message = `*🏔️ O'PIED DU MONT 🍴*\n\n` +
        `Merci pour votre visite ${customerName} !\n` +
        `------------------------------------------\n` +
        state.cart.map((item) => `• ${item.quantity}x ${item.name} : ${formatPrice(item.price * item.quantity)}`).join('\n') +
        `\n------------------------------------------\n` +
        `*TOTAL : ${formatPrice(total)}*\n\n` +
        `À très bientôt ! ✨`;

      // Format international pour WhatsApp : 225 + numéro
      const whatsappUrl = `whatsapp://send?phone=225${phoneNumber}&text=${encodeURIComponent(message)}`;

      // 4. Finalisation
      Alert.alert(
        "Commande Validée",
        "Client enregistré avec succès. Envoyer le reçu ?",
        [
          { 
            text: "Plus tard", 
            onPress: () => {
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/caisse');
            }
          },
          { 
            text: "OUI (WhatsApp)", 
            onPress: () => {
              Linking.canOpenURL(whatsappUrl).then(supported => {
                if (supported) {
                  Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert("Erreur", "WhatsApp n'est pas installé.");
                }
              });
              dispatch({ type: 'CLEAR_CART' });
              router.replace('/caisse');
            }
          }
        ]
      );

    } catch (error: any) {
      Alert.alert("Erreur technique", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: colors.foreground }]}>Client & Reçu</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NOM DU CLIENT</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: M. Kouassi"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted, marginTop: 15 }]}>NUMÉRO WHATSAPP (10 chiffres)</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={[styles.prefix, { color: colors.muted }]}>+225 </Text>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
              placeholder="0700000000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Total de la vente</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (isProcessing || state.cart.length === 0) ? 0.7 : 1 }]}
          onPress={validateOrder}
          disabled={isProcessing || state.cart.length === 0}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>VALIDER ET ENVOYER REÇU</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>RETOURNER À LA CAISSE</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25 },
  card: { padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center' },
  prefix: { fontSize: 16, fontWeight: 'bold', marginRight: 5 },
  summaryCard: { alignItems: 'center', marginVertical: 30 },
  summaryTitle: { fontSize: 18, marginBottom: 5 },
  totalAmount: { fontSize: 36, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center', elevation: 2 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { marginTop: 25, alignItems: 'center' }
});