/**
 * Checkout Screen - O'PIED DU MONT Mobile
 * Enregistrement client et envoi du reçu WhatsApp
 * Correction des erreurs de typage TypeScript
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';

// @ts-ignore
import { ScreenContainer } from '../components/screen-container';
// @ts-ignore
import { useColors } from '../hooks/use-colors';
// @ts-ignore
import { formatPrice } from '../lib/formatting';
// @ts-ignore
import { useCart } from '../context/cart-context';
// @ts-ignore
import { supabase } from '../supabase';

// Définition de l'interface pour corriger les erreurs 7006
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CheckoutScreen() {
  const colors = useColors();
  const router = useRouter();
  const { cart, clearCart } = useCart();
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Correction : Ajout des types (sum: number, item: CartItem)
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const validateOrder = async () => {
    if (!customerName || !phoneNumber) {
      Alert.alert("Erreur", "Veuillez remplir le nom et le numéro WhatsApp du client.");
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
          articles: cart, 
          statut: 'complete'
        });

      if (orderError) throw orderError;

      // 3. Préparation du message WhatsApp
      // Correction : Ajout du type (item: CartItem)
      const message = `*O'PIED DU MONT*\n\n` +
        `Merci pour votre visite ${customerName} !\n` +
        `--------------------------\n` +
        cart.map((item: CartItem) => `- ${item.quantity}x ${item.name} : ${formatPrice(item.price * item.quantity)}`).join('\n') +
        `\n--------------------------\n` +
        `*TOTAL : ${formatPrice(total)}*\n\n` +
        `À bientôt ! 🍽️`;

      const whatsappUrl = `whatsapp://send?phone=225${phoneNumber}&text=${encodeURIComponent(message)}`;

      // 4. Finalisation
      Alert.alert(
        "Commande Validée",
        "Le client a été enregistré. Voulez-vous envoyer le reçu WhatsApp ?",
        [
          { 
            text: "Plus tard", 
            onPress: () => {
              clearCart();
              router.replace('/(tabs)' as any);
            }
          },
          { 
            text: "Envoyer le reçu", 
            onPress: () => {
              Linking.openURL(whatsappUrl).catch(() => {
                Alert.alert("Erreur", "WhatsApp n'est pas installé sur ce téléphone.");
              });
              clearCart();
              router.replace('/(tabs)' as any);
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
        <Text style={[styles.title, { color: colors.foreground }]}>Validation & Reçu</Text>
        
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>NOM DU CLIENT</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: M. Kouassi"
            placeholderTextColor={colors.muted}
            value={customerName}
            onChangeText={setCustomerName}
          />

          <Text style={[styles.label, { color: colors.muted, marginTop: 15 }]}>NUMÉRO WHATSAPP (Côte d'Ivoire)</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={[styles.prefix, { color: colors.muted }]}>+225 </Text>
            <TextInput
              style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
              placeholder="0102030405"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Résumé de la note</Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isProcessing ? 0.7 : 1 }]}
          onPress={validateOrder}
          disabled={isProcessing}
        >
          <Text style={styles.submitBtnText}>
            {isProcessing ? "Traitement..." : "Valider et Envoyer Reçu"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={{ color: colors.muted }}>Modifier la commande</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 25 },
  card: { padding: 20, borderRadius: 15, borderWidth: 1, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center' },
  prefix: { fontSize: 16, fontWeight: 'bold', marginRight: 5 },
  summaryCard: { alignItems: 'center', marginVertical: 30 },
  summaryTitle: { fontSize: 18, marginBottom: 5 },
  totalAmount: { fontSize: 36, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { marginTop: 20, alignItems: 'center' }
});