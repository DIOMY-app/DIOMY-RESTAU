/**
 * Sign Up Screen - O'PIED DU MONT Mobile
 * Inscription via Numéro de Téléphone
 * Emplacement : /app/signup.tsx
 * Version : Corrigée avec PIN par défaut et validation 10 chiffres (CI)
 */

import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';

// Validation spécifique au format de téléphone ivoirien (10 chiffres)
const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone.replace(/\s/g, ''));
const isValidName = (name: string) => name.trim().length >= 2;
const validatePassword = (pass: string) => ({
  valid: pass.length >= 6,
  message: pass.length < 6 ? 'Le mot de passe doit contenir au moins 6 caractères' : ''
});

export default function SignUpScreen() {
  const router = useRouter();
  const colors = useColors();
  const { dispatch } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);

    // Validations locales
    if (!isValidName(name)) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('Numéro de téléphone invalide (10 chiffres attendus)');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = phone.replace(/\s/g, '');

      // 1. Vérifier si le numéro existe déjà
      const { data: existingUser } = await supabase
        .from('employes')
        .select('id')
        .eq('telephone', cleanPhone)
        .maybeSingle();

      if (existingUser) {
        throw new Error('Ce numéro de téléphone est déjà associé à un compte.');
      }

      // 2. Insertion avec PIN par défaut "1234"
      const { data, error: insertError } = await supabase
        .from('employes')
        .insert([
          { 
            nom: name, 
            telephone: cleanPhone, 
            password: password, 
            pin: "1234", 
            role: 'staff',
            actif: true 
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Mise à jour du contexte global
      dispatch({
        type: 'SET_USER',
        payload: {
          id: data.id.toString(),
          telephone: data.telephone,
          nom: data.nom,
          role: data.role,
          createdAt: data.created_at,
          updatedAt: new Date().toISOString(),
        },
      });

      Alert.alert(
        "Bienvenue ! ✨", 
        "Votre compte a été créé avec succès.\n\nIMPORTANT : Votre code PIN par défaut est 1234. Changez-le rapidement dans vos paramètres.",
        [{ text: "C'est parti !", onPress: () => router.replace("/") }]
      );
      
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>OM</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Créer un compte</Text>
            <Text style={{ color: colors.muted, fontWeight: '700', letterSpacing: 1 }}>O'PIED DU MONT</Text>
          </View>

          {error && (
            <View style={[styles.errorBox, { borderColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Nom complet</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="Ex: Jean Kouassi"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Téléphone (10 chiffres)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="0700000000"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Mot de passe</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Confirmer</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
                placeholder="••••••"
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>S'INSCRIRE MAINTENANT</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>Vous avez déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.primary, fontWeight: '900' }}>Connexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  innerContainer: { flex: 1, paddingHorizontal: 30, paddingVertical: 50, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 35 },
  logoCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logoText: { color: 'white', fontSize: 22, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 5, letterSpacing: -1 },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, padding: 15, borderRadius: 15, marginBottom: 20 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: '800', fontSize: 13 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '900', marginBottom: 8, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 2, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, fontSize: 16, fontWeight: '700' },
  submitBtn: { borderRadius: 18, paddingVertical: 20, alignItems: 'center', marginTop: 10, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }
});