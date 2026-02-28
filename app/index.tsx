/**
 * HomeScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/index.tsx
 * Correction : Intégration du changement de mot de passe dans le Modal Profil + Protection Session.
 */

import React, { useState, useEffect } from "react";
import { 
  ScrollView, Text, View, TouchableOpacity, StyleSheet, 
  Dimensions, ActivityIndicator, Modal, Alert, TextInput 
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "../components/screen-container";
import { useApp } from "../app-context";
import { useColors } from "../hooks/use-colors";
import { formatPrice } from "../formatting";
import { supabase } from "../supabase";

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
  allowedRoles: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { 
    id: '1', 
    label: 'Caisse', 
    icon: '🛒', 
    route: 'caisse', 
    color: '#8B6F47',
    allowedRoles: ['admin', 'manager', 'waiter', 'cashier', 'staff'] 
  },
  { 
    id: '2', 
    label: 'Cuisine', 
    icon: '👨‍🍳', 
    route: 'CuisineScreen', 
    color: '#EAB308',
    allowedRoles: ['admin', 'manager', 'chef', 'waiter', 'staff'] 
  },
  { 
    id: '3', 
    label: 'Stock', 
    icon: '📦', 
    route: 'stock', 
    color: '#D4A574',
    allowedRoles: ['admin', 'manager', 'chef', 'staff'] 
  },
  { 
    id: '4', 
    label: 'Rapports', 
    icon: '📈', 
    route: 'RapportScreen', 
    color: '#6BA55D',
    allowedRoles: ['admin', 'manager', 'staff'] 
  },
  { 
    id: '5', 
    label: 'Équipe', 
    icon: '👥', 
    route: 'employees', 
    color: '#C85A54',
    allowedRoles: ['admin', 'manager', 'staff'] 
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, dispatch } = useApp();
  
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  
  // États pour le changement de mot de passe (dans le modal)
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (state && state.user === null) {
      router.replace('/login');
    }
  }, [state?.user]);

  if (!state || !state.user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#8B6F47" />
        <Text style={{ marginTop: 10, color: '#666' }}>Vérification de la session...</Text>
      </View>
    );
  }

  const user = state.user;
  const userRole = user.role;
  const userName = user.nom;

  const filteredActions = QUICK_ACTIONS.filter(action => 
    action.allowedRoles.includes(userRole)
  );

  const todayOrders = state?.orders || [];
  const dailyTotal = todayOrders.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 4) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 4 caractères.");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('employes')
        .update({ password: newPassword })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Succès", "Mot de passe mis à jour avec succès.");
      setNewPassword('');
      setShowPwdFields(false);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de mettre à jour le mot de passe.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous quitter l'application ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive", 
          onPress: () => {
            setIsProfileVisible(false);
            dispatch({ type: 'SET_USER', payload: null });
          } 
        }
      ]
    );
  };

  const recentOrders = todayOrders.slice(-3).reverse();

  return (
    <ScreenContainer style={{ padding: 16 }}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gap6}>
          
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>O'PIED DU MONT</Text>
              <View style={styles.rowCenter}>
                <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>{userName}</Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>
                    {userRole.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.avatarCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setIsProfileVisible(true)}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </TouchableOpacity>
          </View>

          {['admin', 'manager', 'cashier', 'staff', 'waiter'].includes(userRole) && (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{todayOrders.length}</Text>
                <Text style={styles.statLabel}>COMMANDES</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: '#22c55e' }]}>{formatPrice(dailyTotal)}</Text>
                <Text style={styles.statLabel}>CA DU JOUR</Text>
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services</Text>
            <View style={styles.actionGrid}>
              {filteredActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, { backgroundColor: action.color }]}
                  onPress={() => router.push(`/${action.route}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {recentOrders.length > 0 && (
            <View>
              <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                  Ventes récentes
                </Text>
                <TouchableOpacity onPress={() => router.push('/RapportScreen' as any)}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.ordersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {recentOrders.map((order: any, index: number) => (
                  <View
                    key={order.id}
                    style={[
                      styles.orderRow,
                      index < recentOrders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={{ fontWeight: '800', color: colors.foreground }}>
                        #{order.id.toString().slice(-4).toUpperCase()}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: order.statut === 'paye' ? '#dcfce7' : '#f1f5f9' }]}>
                         <Text style={{ fontSize: 10, fontWeight: 'bold', color: order.statut === 'paye' ? '#166534' : '#475569' }}>
                           {order.statut === 'paye' ? 'PAYÉ' : 'EN ATTENTE'}
                         </Text>
                      </View>
                    </View>
                    <View style={[styles.rowBetween, { marginTop: 8 }]}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.foreground }}>
                        {formatPrice(order.total || 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL PROFIL AMÉLIORÉ */}
      <Modal visible={isProfileVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Mon Compte</Text>
              <TouchableOpacity onPress={() => { setIsProfileVisible(false); setShowPwdFields(false); }}>
                <Text style={{ color: colors.muted, fontWeight: '900' }}>FERMER</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={[styles.avatarLarge, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarTextLarge}>{userName.substring(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={[styles.profileName, { color: colors.foreground }]}>{userName}</Text>
              <Text style={{ color: colors.muted }}>{user?.telephone}</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>RÔLE</Text>
                <Text style={[styles.infoVal, { color: colors.primary }]}>{userRole.toUpperCase()}</Text>
              </View>
            </View>

            {/* SECTION SÉCURITÉ / MOT DE PASSE */}
            <View style={{ marginBottom: 20 }}>
                <TouchableOpacity 
                    onPress={() => setShowPwdFields(!showPwdFields)}
                    style={[styles.pwdToggle, { borderColor: colors.border }]}
                >
                    <Text style={{ color: colors.foreground, fontWeight: '700' }}>Modifier mon mot de passe</Text>
                    <Text style={{ color: colors.primary }}>{showPwdFields ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showPwdFields && (
                    <View style={{ marginTop: 10, gap: 10 }}>
                        <TextInput 
                            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                            placeholder="Nouveau mot de passe"
                            placeholderTextColor={colors.muted}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TouchableOpacity 
                            style={[styles.updateBtn, { backgroundColor: colors.primary }]}
                            onPress={handleUpdatePassword}
                            disabled={isUpdating}
                        >
                            {isUpdating ? <ActivityIndicator color="white" /> : <Text style={styles.updateBtnText}>VALIDER LE CHANGEMENT</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity 
              style={styles.logoutBtn} 
              onPress={handleLogout}
            >
              <Text style={styles.logoutBtnText}>SE DÉCONNECTER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gap6: { gap: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  avatarCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 14 },
  statBox: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1.5, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  actionCard: { 
    width: (width - 46) / 2, 
    borderRadius: 28, 
    padding: 20, 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  iconCircle: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionLabel: { color: 'white', fontWeight: '900', fontSize: 16 },
  ordersContainer: { borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
  orderRow: { padding: 20 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  profileInfo: { alignItems: 'center', marginBottom: 30 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarTextLarge: { color: 'white', fontSize: 32, fontWeight: '900' },
  profileName: { fontSize: 24, fontWeight: '900', marginBottom: 5 },
  infoCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginBottom: 5 },
  infoVal: { fontSize: 16, fontWeight: '900' },
  pwdToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed' },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14 },
  updateBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  updateBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },
  logoutBtn: { backgroundColor: '#fee2e2', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  logoutBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 15, letterSpacing: 1 }
});