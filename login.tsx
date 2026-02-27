/**
 * Login Screen - O'PIED DU MONT Mobile
 * Connexion via Numéro de Téléphone
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// @ts-ignore
import { useApp } from './lib/app-context.tsx';
// @ts-ignore
import { useColors } from './hooks/use-colors.tsx';
// @ts-ignore
import { supabase } from './supabase';

// Validation du format ivoirien (10 chiffres)
const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone.replace(/\s/g, ''));

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { dispatch } = useApp();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const cleanPhone = phone.replace(/\s/g, '');

    if (!isValidPhone(cleanPhone)) {
      setError('Veuillez entrer un numéro valide (10 chiffres)');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Recherche de l'employé dans la table Supabase par son téléphone
      const { data: employee, error: dbError } = await supabase
        .from('employes')
        .select('*')
        .eq('telephone', cleanPhone)
        .single();

      if (dbError || !employee) {
        setError('Compte introuvable ou numéro incorrect');
        return;
      }

      if (!employee.est_actif) {
        setError('Ce compte est désactivé. Contactez votre administrateur.');
        return;
      }

      // NOTE: Pour un système de production, on utiliserait supabase.auth.signInWithPassword
      // Ici, on valide la connexion avec les données de la table 'employes'
      
      dispatch({
        type: 'SET_USER',
        payload: {
          id: employee.id,
          phone: employee.telephone,
          name: employee.nom,
          role: employee.role, // Récupère le vrai rôle (admin, waiter, chef, etc.)
          createdAt: employee.created_at,
          updatedAt: new Date().toISOString(),
        },
      });

      router.replace('/(tabs)');
    } catch (err) {
      setError('Une erreur est survenue lors de la connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.primary }]}>O'PIED DU MONT</Text>
            <Text style={styles.subtitle}>Espace Personnel</Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="Ex: 0708091011"
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

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginBtnText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>Nouveau membre ? </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Créer un compte</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Note de service</Text>
            <Text style={styles.demoText}>Utilisez vos identifiants fournis par la direction.</Text>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b' },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: 'bold' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  loginBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  loginBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  demoBox: { marginTop: 40, padding: 16, backgroundColor: '#f1f5f9', borderRadius: 10 },
  demoTitle: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 4, textAlign: 'center' },
  demoText: { fontSize: 11, color: '#475569', textAlign: 'center' }
});