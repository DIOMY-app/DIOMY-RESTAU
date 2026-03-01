/**
 * Login Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/login.tsx
 * Correction : Alignement des colonnes (actif au lieu de est_actif)
 */

import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, StyleSheet, SafeAreaView, Alert 
} from 'react-native';
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
      // 1. Recherche de l'employé
      const { data: employee, error: dbError } = await supabase
        .from('employes')
        .select('*')
        .eq('telephone', cleanPhone)
        .maybeSingle();

      if (dbError || !employee) {
        setError('Compte introuvable ou numéro incorrect');
        setIsLoading(false);
        return;
      }

      // 2. Vérification du statut du compte (CORRIGÉ : 'actif' au lieu de 'est_actif')
      if (employee.actif === false) {
        setError('Ce compte est désactivé. Contactez la direction.');
        setIsLoading(false);
        return;
      }

      // 3. Vérification du mot de passe
      if (employee.password !== password) {
        setError('Mot de passe incorrect');
        setIsLoading(false);
        return;
      }
      
      // 4. Mise à jour du contexte global
      dispatch({
        type: 'SET_USER',
        payload: {
          id: employee.id.toString(),
          nom: employee.nom,
          role: employee.role, 
          telephone: employee.telephone,
          createdAt: employee.created_at,
          updatedAt: new Date().toISOString(),
        },
      });

      // 5. Redirection vers l'accueil
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
            <Text style={[styles.subtitle, { color: colors.muted, fontWeight: '800' }]}>ESPACE PERSONNEL</Text>
          </View>

          {error && (
            <View style={[styles.errorBox, { borderColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="0708091011"
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

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginBtnText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={{ color: colors.muted }}>Besoin d'aide ? </Text>
            <TouchableOpacity onPress={() => Alert.alert("Assistance", "Contactez votre administrateur pour réinitialiser votre accès.")}>
              <Text style={{ color: colors.primary, fontWeight: '900' }}>Cliquez ici</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.demoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.demoTitle, { color: colors.muted }]}>SÉCURITÉ</Text>
            <Text style={[styles.demoText, { color: colors.foreground }]}>
              Cette application est réservée à l'usage interne du restaurant O'PIED DU MONT. 
              Toute tentative d'accès non autorisé est journalisée.
            </Text>
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
  logo: { fontSize: 34, fontWeight: '900', marginBottom: 8, letterSpacing: -1.5 },
  subtitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5 },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, padding: 14, borderRadius: 16, marginBottom: 25 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: '800', fontSize: 13 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 15, fontSize: 16, fontWeight: '600' },
  loginBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 15, marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  loginBtnText: { color: 'white', fontSize: 17, fontWeight: '900' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  demoBox: { marginTop: 50, padding: 20, borderRadius: 20, borderWidth: 1 },
  demoTitle: { fontSize: 11, fontWeight: '900', marginBottom: 8, textAlign: 'center', letterSpacing: 1 },
  demoText: { fontSize: 12, textAlign: 'center', lineHeight: 18, opacity: 0.8 }
});