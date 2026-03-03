/**
 * Login Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/login.tsx
 * Version : Corrigée (Colonne 'actif' + Validation CI)
 */

import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';

import { useApp } from '../app-context';
import { useColors } from '../hooks/use-colors';
import { supabase } from '../supabase';

// Validation du format ivoirien (10 chiffres sans espaces)
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

    // Validations de base
    if (!cleanPhone) {
      setError('Veuillez entrer votre numéro de téléphone');
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setError('Le numéro doit comporter 10 chiffres (ex: 07...)');
      return;
    }

    if (!password) {
      setError('Veuillez entrer votre mot de passe');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Recherche de l'employé dans la table 'employes'
      const { data: employee, error: dbError } = await supabase
        .from('employes')
        .select('*')
        .eq('telephone', cleanPhone)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!employee) {
        setError('Aucun compte associé à ce numéro');
        setIsLoading(false);
        return;
      }

      // 2. Vérification du statut du compte (Colonne corrigée : actif)
      if (employee.actif === false) {
        setError('Ce compte a été désactivé par l\'administrateur');
        setIsLoading(false);
        return;
      }

      // 3. Vérification du mot de passe (Comparaison directe selon ton schéma actuel)
      if (employee.password !== password) {
        setError('Mot de passe incorrect');
        setIsLoading(false);
        return;
      }
      
      // 4. Succès : Mise à jour du contexte global
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

      // 5. Redirection vers l'accueil (index)
      router.replace('/');
      
    } catch (err: any) {
      console.error("Erreur Login:", err.message);
      setError('Erreur de connexion au serveur. Vérifiez votre internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            
            <View style={styles.header}>
              <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoIconText}>PM</Text>
              </View>
              <Text style={[styles.logo, { color: colors.foreground }]}>O'PIED DU MONT</Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>Gestion Restaurant & Bar</Text>
            </View>

            {error && (
              <View style={[styles.errorBox, { borderColor: '#ef4444' }]}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Téléphone</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.border, 
                    backgroundColor: colors.surface, 
                    color: colors.foreground 
                  }]}
                  placeholder="Ex: 0701020304"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(val) => {
                    setError(null);
                    setPhone(val);
                  }}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Mot de passe</Text>
                <TextInput
                  style={[styles.input, { 
                    borderColor: colors.border, 
                    backgroundColor: colors.surface, 
                    color: colors.foreground 
                  }]}
                  placeholder="Votre code secret"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  value={password}
                  onChangeText={(val) => {
                    setError(null);
                    setPassword(val);
                  }}
                />
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, { 
                  backgroundColor: colors.primary, 
                  opacity: isLoading ? 0.7 : 1 
                }]}
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
            </View>

            <View style={styles.footer}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Problème d'accès ? </Text>
              <TouchableOpacity onPress={() => Alert.alert("Aide", "Contactez le gérant pour réinitialiser votre mot de passe.")}>
                <Text style={{ color: colors.primary, fontWeight: '900' }}>Contacter le gérant</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.securityNotice, { backgroundColor: colors.surface + '80' }]}>
              <Text style={[styles.securityText, { color: colors.muted }]}>
                Accès sécurisé. L'utilisation frauduleuse de cette application fera l'objet de poursuites.
              </Text>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  innerContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 50 },
  header: { alignItems: 'center', marginBottom: 50 },
  logoIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  logoIconText: { color: 'white', fontSize: 24, fontWeight: '900' },
  logo: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, fontWeight: '700', marginTop: 5, opacity: 0.6 },
  form: { width: '100%' },
  errorBox: { backgroundColor: '#fee2e2', borderWidth: 1, padding: 15, borderRadius: 18, marginBottom: 25 },
  errorText: { color: '#ef4444', textAlign: 'center', fontWeight: '800', fontSize: 13 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '900', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, fontWeight: '700' },
  loginBtn: { borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  loginBtnText: { color: 'white', fontSize: 17, fontWeight: '900' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  securityNotice: { marginTop: 60, padding: 15, borderRadius: 15, alignItems: 'center' },
  securityText: { fontSize: 11, textAlign: 'center', lineHeight: 16, fontWeight: '600' }
});