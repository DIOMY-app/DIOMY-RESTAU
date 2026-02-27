/**
 * Sign Up Screen - O'PIED DU MONT Mobile
 * Inscription via Numéro de Téléphone
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// @ts-ignore
import { useApp } from '../lib/app-context';
// @ts-ignore
import { useColors } from '../hooks/use-colors';
// @ts-ignore
import { supabase } from '../supabase';

// Validation spécifique au format de téléphone (ex: 10 chiffres pour la CI)
const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone.replace(/\s/g, ''));
const isValidName = (name: string) => name.trim().length >= 2;
const validatePassword = (pass: string) => ({
  valid: pass.length >= 6,
  message: pass.length < 6 ? 'Minimum 6 caractères' : ''
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

    if (!isValidName(name)) {
      setError('Veuillez entrer un nom valide');
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
      // Inscription réelle via Supabase (en utilisant le téléphone comme identifiant)
      // Note: Supabase Auth supporte le téléphone, mais nécessite une config OTP.
      // Ici, on enregistre l'utilisateur dans notre table 'employes' pour la gestion.
      
      const { data, error: insertError } = await supabase
        .from('employes')
        .insert([
          { 
            nom: name, 
            telephone: phone.replace(/\s/g, ''), 
            role: 'staff',
            est_actif: true 
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // Mise à jour de l'état global
      dispatch({
        type: 'SET_USER',
        payload: {
          id: data.id,
          phone: data.telephone,
          name: data.nom,
          role: 'staff',
        },
      });

      Alert.alert("Succès", "Compte créé avec succès !");
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription.');
      console.error('Sign up error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Créer un compte</Text>
            <Text style={{ color: colors.muted }}>O'PIED DU MONT</Text>
          </View>

          {error && (
            <View style={[styles.errorBox, { borderColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nom complet</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="Ex: Kouassi Koffi"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="0102030405"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
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
            <Text style={[styles.label, { color: colors.foreground }]}>Confirmer mot de passe</Text>
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
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitBtnText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.footer} onPress={() => router.back()}>
            <Text style={{ color: colors.muted }}>Déjà inscrit ? </Text>
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 20 },
  errorText: { color: '#ef4444', textAlign: 'center', fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center' }
});