/**
 * Employees Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/employees.tsx
 * Gestion complète : Liste, Filtrage, Activation et Ajout
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

  // Sécurité : Vérifier si l'utilisateur peut gérer le personnel
  const canManage = state.user?.role === 'admin' || state.user?.role === 'manager';

  const filteredEmployees = (state.employees || []).filter((emp: any) => {
    const matchesSearch = emp.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = emp.est_actif ?? true;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' ? isActive : !isActive);
    return matchesSearch && matchesStatus;
  });

  const handleAddEmployee = async () => {
    if (!newEmpName || !newEmpPhone) {
      Alert.alert("Champs requis", "Le nom et le téléphone sont obligatoires.");
      return;
    }

    if (newEmpPhone.replace(/\s/g, '').length !== 10) {
      Alert.alert("Format invalide", "Le numéro doit comporter 10 chiffres.");
      return;
    }

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('employes')
        .insert([{
          nom: newEmpName,
          telephone: newEmpPhone.replace(/\s/g, ''),
          role: newEmpRole,
          password: 'password123', // Mot de passe par défaut pour la première connexion
          est_actif: true
        }]);

      if (error) throw error;

      Alert.alert("Succès", `${newEmpName} a été ajouté. Le mot de passe par défaut est : password123`);
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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!canManage) return;

    try {
      const { error } = await supabase
        .from('employes')
        .update({ est_actif: !currentStatus })
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
      `Supprimer définitivement ${nom} ? Cette action est irréversible.`,
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
          <Text style={[styles.subtitle, { color: colors.muted }]}>Gérer les accès du personnel</Text>
          
          <TextInput
            style={[styles.searchInput, { 
              borderColor: colors.border, 
              backgroundColor: colors.surface, 
              color: colors.foreground 
            }]}
            placeholder="Rechercher par nom..."
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
                <Text style={{ 
                  color: filterStatus === status ? '#fff' : colors.muted, 
                  fontSize: 11, 
                  fontWeight: '900' 
                }}>
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
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{emp.nom.substring(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.empName, { color: colors.foreground }]}>{emp.nom}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13 }}>{emp.telephone}</Text>
                </View>
                {canManage && (
                  <TouchableOpacity onPress={() => handleDeleteEmployee(emp.id, emp.nom)} style={styles.deleteBtn}>
                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={[styles.roleBadge, { backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '900' }}>
                    {formatRole(emp.role).toUpperCase()}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: emp.est_actif ? '#22c55e20' : '#ef444420' }]}
                  onPress={() => handleToggleStatus(emp.id, emp.est_actif)}
                  disabled={!canManage}
                >
                  <View style={[styles.dot, { backgroundColor: emp.est_actif ? '#22c55e' : '#ef4444' }]} />
                  <Text style={{ color: emp.est_actif ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: '800' }}>
                    {emp.est_actif ? 'Actif' : 'Désactivé'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {filteredEmployees.length === 0 && (
            <View style={styles.emptyView}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Aucun membre ne correspond.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {canManage && (
        <TouchableOpacity
          style={[styles.floatingAddBtn, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ AJOUTER</Text>
        </TouchableOpacity>
      )}

      {/* Modal d'ajout */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouveau collaborateur</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={{ color: colors.muted, fontWeight: '900' }}>FERMER</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.modalLabel}>NOM COMPLET</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Jean Marc Kouassi"
              placeholderTextColor={colors.muted}
              value={newEmpName}
              onChangeText={setNewEmpName}
            />

            <Text style={styles.modalLabel}>TÉLÉPHONE</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="0708091011"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={newEmpPhone}
              onChangeText={setNewEmpPhone}
            />

            <Text style={styles.modalLabel}>RÔLE DANS LE RESTAURANT</Text>
            <View style={styles.roleSelector}>
              {(['waiter', 'cashier', 'chef', 'manager', 'staff'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewEmpRole(r)}
                  style={[styles.roleOption, { 
                    borderColor: newEmpRole === r ? colors.primary : colors.border,
                    backgroundColor: newEmpRole === r ? colors.primary + '10' : 'transparent'
                  }]}
                >
                  <Text style={{ 
                    color: newEmpRole === r ? colors.primary : colors.muted, 
                    fontSize: 11,
                    fontWeight: '900'
                  }}>
                    {formatRole(r).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={handleAddEmployee}
              disabled={isActionLoading}
            >
              {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>ENREGISTRER LE MEMBRE</Text>}
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
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 15, fontWeight: '600', marginBottom: 20 },
  searchInput: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 15, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  listSection: { gap: 12 },
  empCard: { borderRadius: 20, padding: 16, borderWidth: 1, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900', color: '#64748b', fontSize: 18 },
  empName: { fontSize: 17, fontWeight: '800' },
  deleteBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  floatingAddBtn: { position: 'absolute', bottom: 30, right: 20, left: 20, paddingVertical: 18, borderRadius: 20, elevation: 5, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  emptyView: { alignItems: 'center', padding: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', marginBottom: 10, letterSpacing: 1 },
  modalInput: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 20, fontSize: 16 },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 30 },
  roleOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 2 },
  saveBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 }
});