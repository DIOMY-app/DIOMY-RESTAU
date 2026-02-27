/**
 * Login Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/login.tsx
 * Correction : Intégration du champ 'telephone' après mise à jour des types
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';

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

    if (password.length < 4) {
      setError('Le mot de passe est trop court');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Recherche de l'employé dans la table 'employes'
      const { data: employee, error: dbError } = await supabase
        .from('employes')
        .select('*')
        .eq('telephone', cleanPhone)
        .single();

      if (dbError || !employee) {
        setError('Compte introuvable ou numéro incorrect');
        setIsLoading(false);
        return;
      }

      if (!employee.est_actif) {
        setError('Ce compte est désactivé. Contactez la direction.');
        setIsLoading(false);
        return;
      }

      // 2. Vérification du mot de passe
      if (employee.password && employee.password !== password) {
        setError('Mot de passe incorrect');
        setIsLoading(false);
        return;
      }
      
      // 3. Mise à jour du contexte global (Utilise 'telephone' et 'nom')
      dispatch({
        type: 'SET_USER',
        payload: {
          id: employee.id,
          nom: employee.nom,
          role: employee.role, 
          telephone: employee.telephone, // OK si types.ts est mis à jour
          createdAt: employee.created_at,
          updatedAt: new Date().toISOString(),
        },
      });

      // 4. Redirection vers l'accueil
      router.replace('/');
      
    } catch (err) {
      console.error("Erreur Login:", err);
      setError('Une erreur réseau est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.innerContainer}>
          
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.primary }]}>O'PIED DU MONT</Text>
            <Text style={[styles.subtitle, { color: colors.muted, fontWeight: '600' }]}>Espace Personnel</Text>
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
              placeholder="0708091011"
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
            <Text style={{ color: colors.muted }}>Besoin d'aide ? </Text>
            <TouchableOpacity onPress={() => alert("Contactez votre administrateur pour réinitialiser votre accès.")}>
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Cliquez ici</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>SÉCURITÉ</Text>
            <Text style={styles.demoText}>Cette application est réservée à l'usage interne du restaurant O'PIED DU MONT.</Text>
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 45 },
  logo: { fontSize: 34, fontWeight: '900', marginBottom: 8, letterSpacing: -1 },
  subtitle: { fontSize: 16 },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444', padding: 14, borderRadius: 12, marginBottom: 25 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: 'bold' },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16 },
  loginBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 15, marginBottom: 25, elevation: 4 },
  loginBtnText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  demoBox: { marginTop: 50, padding: 20, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  demoTitle: { fontSize: 11, fontWeight: '900', color: '#64748b', marginBottom: 6, textAlign: 'center' },
  demoText: { fontSize: 12, color: '#475569', textAlign: 'center', lineHeight: 18 }
});