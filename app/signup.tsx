/**
 * Sign Up Screen - O'PIED DU MONT Mobile
 * Inscription via Numéro de Téléphone
 * Emplacement : /app/signup.tsx
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
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
      const cleanPhone = phone.replace(/\s/g, '');

      // 1. Vérifier si l'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('employes')
        .select('id')
        .eq('telephone', cleanPhone)
        .single();

      if (existingUser) {
        throw new Error('Ce numéro de téléphone est déjà utilisé.');
      }

      // 2. Insertion dans la table 'employes'
      const { data, error: insertError } = await supabase
        .from('employes')
        .insert([
          { 
            nom: name, 
            telephone: cleanPhone, 
            password: password, // Note: Dans un environnement de prod, utilisez un hachage côté serveur
            role: 'staff',
            est_actif: true 
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Mise à jour de l'état global (Conforme à types.ts)
      dispatch({
        type: 'SET_USER',
        payload: {
          id: data.id,
          telephone: data.telephone,
          nom: data.nom,
          role: 'staff',
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      Alert.alert("Bienvenue !", "Votre compte a été créé avec succès.");
      router.replace('/'); // Redirection vers l'accueil (index)
      
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
      console.error('Sign up error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>Rejoindre l'équipe</Text>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>O'PIED DU MONT</Text>
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
              placeholder="Ex: Koffi Kouamé"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="0701020304"
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
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
              placeholderTextColor="#94a3b8"
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
              <Text style={styles.submitBtnText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 35 },
  title: { fontSize: 30, fontWeight: '900', marginBottom: 8, letterSpacing: -0.5 },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, padding: 14, borderRadius: 12, marginBottom: 20 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: 'bold', fontSize: 13 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10, marginBottom: 25, elevation: 3 },
  submitBtnText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
});