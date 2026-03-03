/**
 * Employees Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/employees.tsx
 * Version : 2.1 - Vérification Doublons & Reset PIN Admin
 */

import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatRole } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';

type Role = 'admin' | 'manager' | 'waiter' | 'cashier' | 'chef' | 'staff';

export default function EmployeesScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  // États pour la liste
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // États pour le formulaire d'ajout
  const [isModalVisible, setModalVisible] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<Role>('waiter');

  // Sécurité basée sur le rôle utilisateur
  const isAdmin = state.user?.role === 'admin';
  const canManage = isAdmin || state.user?.role === 'manager';

  // Filtrage local de la liste chargée dans le contexte
  const filteredEmployees = (state.employees || []).filter((emp: any) => {
    const nomMatch = emp.nom || '';
    const matchesSearch = nomMatch.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = emp.actif ?? true; 
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' ? isActive : !isActive);
    return matchesSearch && matchesStatus;
  });

  // --- LOGIQUE : VÉRIFICATION DOUBLON ET AJOUT ---
  const handleAddEmployee = async () => {
    if (!newEmpName || !newEmpPhone) {
      Alert.alert("Champs requis", "Le nom et le téléphone sont obligatoires.");
      return;
    }

    const cleanPhone = newEmpPhone.replace(/\s/g, '');
    if (cleanPhone.length !== 10) {
      Alert.alert("Format invalide", "Le numéro doit comporter 10 chiffres.");
      return;
    }

    setIsActionLoading(true);
    try {
      // 1. Vérification si le téléphone existe déjà (Règle Doublon)
      const { data: existing, error: checkError } = await supabase
        .from('employes')
        .select('id, nom')
        .eq('telephone', cleanPhone)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        setIsActionLoading(false);
        return Alert.alert("Doublon détecté", `Ce numéro appartient déjà à ${existing.nom}.`);
      }

      // 2. Insertion si tout est OK
      const defaultPin = "1234";
      const { error } = await supabase
        .from('employes')
        .insert([{
          nom: newEmpName,
          telephone: cleanPhone,
          role: newEmpRole,
          password: 'password123',
          pin: defaultPin,
          actif: true 
        }]);

      if (error) throw error;

      Alert.alert(
        "Succès ✨", 
        `${newEmpName} a été ajouté.\n\nPIN par défaut : ${defaultPin}`
      );
      
      // Reset et fermeture
      setModalVisible(false);
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpRole('waiter');
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- LOGIQUE : RESET PIN (Admin Uniquement) ---
  const handleResetPin = (id: string, nom: string) => {
    Alert.alert(
      "Réinitialiser le PIN",
      `Voulez-vous remettre le PIN de ${nom} à "1234" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Réinitialiser", 
          onPress: async () => {
            const { error } = await supabase
              .from('employes')
              .update({ pin: "1234" })
              .eq('id', id);
            
            if (!error) Alert.alert("Succès", `Le PIN de ${nom} est de nouveau 1234.`);
            else Alert.alert("Erreur", "Impossible de réinitialiser le PIN.");
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('employes')
        .update({ actif: !currentStatus })
        .eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Erreur", "Impossible de modifier le statut.");
    }
  };

  const handleDeleteEmployee = (id: string, nom: string) => {
    if (state.user?.id === id) {
      Alert.alert("Action impossible", "Vous ne pouvez pas vous supprimer vous-même.");
      return;
    }

    Alert.alert(
      "Confirmation",
      `Supprimer définitivement ${nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('employes').delete().eq('id', id);
            if (error) Alert.alert("Erreur", "Impossible de supprimer ce membre.");
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.foreground }]}>Équipe</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>O'PIED DU MONT - Gestion du personnel</Text>
          
          <TextInput
            style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
            placeholder="Rechercher un membre..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.filterRow}>
            {(['all', 'active', 'inactive'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterTab, { 
                  backgroundColor: filterStatus === status ? colors.primary : colors.surface,
                  borderColor: filterStatus === status ? colors.primary : colors.border 
                }]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={{ color: filterStatus === status ? 'white' : colors.muted, fontSize: 10, fontWeight: '900' }}>
                  {status === 'all' ? 'TOUS' : status === 'active' ? 'ACTIFS' : 'INACTIFS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.listSection}>
          {filteredEmployees.map((emp: any) => (
            <View key={emp.id} style={[styles.empCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(emp.nom || 'E').substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.empName, { color: colors.foreground }]}>{emp.nom}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{emp.telephone}</Text>
                </View>
                
                {canManage && (
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    {isAdmin && (
                      <TouchableOpacity 
                        onPress={() => handleResetPin(emp.id, emp.nom)} 
                        style={[styles.actionIconBtn, { backgroundColor: colors.primary + '15' }]}
                      >
                        <Text style={{ fontSize: 14 }}>🔑</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      onPress={() => handleDeleteEmployee(emp.id, emp.nom)} 
                      style={[styles.actionIconBtn, { backgroundColor: colors.error + '15' }]}
                    >
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.roleBadge, { backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '900' }}>
                    {formatRole(emp.role).toUpperCase()}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: emp.actif ? colors.success + '15' : colors.error + '15' }]}
                  onPress={() => handleToggleStatus(emp.id, emp.actif)}
                  disabled={!canManage}
                >
                  <View style={[styles.dot, { backgroundColor: emp.actif ? colors.success : colors.error }]} />
                  <Text style={{ color: emp.actif ? colors.success : colors.error, fontSize: 11, fontWeight: '800' }}>
                    {emp.actif ? 'Actif' : 'Désactivé'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {canManage && (
        <TouchableOpacity
          style={[styles.floatingAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ NOUVEAU MEMBRE</Text>
        </TouchableOpacity>
      )}

      {/* Modal d'ajout */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Ajouter à l'Équipe</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={{ color: colors.primary, fontWeight: '900' }}>ANNULER</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>NOM COMPLET</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Kouassi Konan"
              placeholderTextColor={colors.muted}
              value={newEmpName}
              onChangeText={setNewEmpName}
            />

            <Text style={styles.modalLabel}>N° TÉLÉPHONE</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="0700000000"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={newEmpPhone}
              onChangeText={setNewEmpPhone}
            />

            <Text style={styles.modalLabel}>RÔLE ATTRIBUÉ</Text>
            <View style={styles.roleSelector}>
              {(['waiter', 'cashier', 'chef', 'manager', 'staff'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewEmpRole(r)}
                  style={[styles.roleOption, { 
                    borderColor: newEmpRole === r ? colors.primary : colors.border,
                    backgroundColor: newEmpRole === r ? colors.primary + '15' : 'transparent'
                  }]}
                >
                  <Text style={{ color: newEmpRole === r ? colors.primary : colors.muted, fontSize: 10, fontWeight: '900' }}>
                    {formatRole(r).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ℹ️ Un PIN par défaut (1234) sera attribué.</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={handleAddEmployee}
              disabled={isActionLoading}
            >
              {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>ENREGISTRER</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  headerSection: { marginBottom: 25 },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 14, fontWeight: '600', marginBottom: 20, opacity: 0.7 },
  searchInput: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  listSection: { gap: 12 },
  empCard: { borderRadius: 24, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900', fontSize: 20 },
  empName: { fontSize: 17, fontWeight: '800' },
  actionIconBtn: { padding: 8, borderRadius: 12, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  floatingAddBtn: { position: 'absolute', bottom: 30, right: 20, left: 20, paddingVertical: 18, borderRadius: 22, elevation: 4, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalLabel: { fontSize: 10, fontWeight: '900', color: '#888', marginBottom: 8, letterSpacing: 1 },
  modalInput: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 20, fontSize: 16 },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  roleOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  infoBox: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, marginBottom: 20 },
  infoText: { fontSize: 12, color: '#475569', fontWeight: '600', textAlign: 'center' },
  saveBtn: { paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});