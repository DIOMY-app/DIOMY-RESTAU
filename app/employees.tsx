/**
 * Employees Screen - O'PIED DU MONT Mobile
 * Emplacement : /app/employees.tsx
 * Gestion complète : Liste, Filtrage, Activation et Ajout
 */

import React, { useState } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, 
  StyleSheet, Alert, Modal, ActivityIndicator 
} from 'react-native';

import { ScreenContainer } from '../components/screen-container';
import { useColors } from '../hooks/use-colors';
import { formatRole } from '../formatting';
import { useApp } from '../app-context';
import { supabase } from '../supabase';

type Role = 'admin' | 'manager' | 'waiter' | 'cashier' | 'chef';

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
      Alert.alert("Erreur", "Le nom et le téléphone sont obligatoires.");
      return;
    }

    if (newEmpPhone.length !== 10) {
      Alert.alert("Erreur", "Le numéro doit comporter 10 chiffres.");
      return;
    }

    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('employes')
        .insert([{
          nom: newEmpName,
          telephone: newEmpPhone,
          role: newEmpRole,
          est_actif: true
        }]);

      if (error) throw error;

      Alert.alert("Succès", `${newEmpName} a été ajouté au personnel.`);
      setModalVisible(false);
      setNewEmpName('');
      setNewEmpPhone('');
      // Note: Le rechargement sera géré par le listener temps réel dans _layout.tsx
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
      Alert.alert("Erreur", error.message);
    }
  };

  const handleDeleteEmployee = (id: string, nom: string) => {
    if (!canManage) {
      Alert.alert("Accès refusé", "Seul un administrateur peut supprimer un employé.");
      return;
    }

    Alert.alert(
      "Confirmation",
      `Supprimer définitivement ${nom} de la base de données ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.from('employes').delete().eq('id', id);
            if (error) Alert.alert("Erreur", "Impossible de supprimer.");
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.gap4}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Équipe O'PIED</Text>
            
            <TextInput
              style={[styles.searchInput, { 
                borderColor: colors.border, 
                backgroundColor: colors.surface, 
                color: colors.foreground 
              }]}
              placeholder="Rechercher un collègue..."
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
                    borderColor: colors.border 
                  }]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text style={{ 
                    color: filterStatus === status ? '#fff' : colors.foreground, 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                  }}>
                    {status === 'all' ? 'TOUS' : status === 'active' ? 'ACTIFS' : 'INACTIFS'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.gap3}>
            {filteredEmployees.map((emp: any) => (
              <View key={emp.id} style={[styles.empCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.empName, { color: colors.foreground }]}>{emp.nom}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>📞 {emp.telephone}</Text>
                  </View>
                  {canManage && (
                    <TouchableOpacity onPress={() => handleDeleteEmployee(emp.id, emp.nom)} style={styles.deleteBtn}>
                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View style={[styles.roleBadge, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
                    <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: '900' }}>
                      {formatRole(emp.role).toUpperCase()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: emp.est_actif ? '#22c55e' : '#ef4444' }]}
                    onPress={() => handleToggleStatus(emp.id, emp.est_actif)}
                    disabled={!canManage}
                  >
                    <Text style={styles.statusText}>{emp.est_actif ? 'Actif' : 'Désactivé'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {filteredEmployees.length === 0 && (
              <View style={styles.emptyView}>
                <Text style={{ color: colors.muted }}>Aucun membre trouvé.</Text>
              </View>
            )}
          </View>

          {canManage && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBtnText}>+ Ajouter un membre</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal d'ajout */}
      <Modal visible={isModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouveau membre</Text>
            
            <Text style={styles.modalLabel}>NOM COMPLET</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Ex: Jean Marc"
              placeholderTextColor={colors.muted}
              value={newEmpName}
              onChangeText={setNewEmpName}
            />

            <Text style={styles.modalLabel}>TÉLÉPHONE (Côte d'Ivoire)</Text>
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
              {(['waiter', 'cashier', 'chef', 'manager'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewEmpRole(r)}
                  style={[styles.roleOption, { 
                    borderColor: newEmpRole === r ? colors.primary : colors.border,
                    backgroundColor: newEmpRole === r ? colors.primary + '15' : 'transparent'
                  }]}
                >
                  <Text style={{ 
                    color: newEmpRole === r ? colors.primary : colors.muted, 
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {formatRole(r).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 25 }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.background }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.foreground }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} 
                onPress={handleAddEmployee}
                disabled={isActionLoading}
              >
                {isActionLoading ? <ActivityIndicator color="white" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  gap4: { gap: 16 },
  gap3: { gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  searchInput: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 15 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  filterTab: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  empCard: { borderRadius: 16, padding: 18, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  empName: { fontSize: 18, fontWeight: '800' },
  deleteBtn: { padding: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  addBtn: { paddingVertical: 18, borderRadius: 15, marginTop: 15, elevation: 3 },
  addBtnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16, letterSpacing: 0.5 },
  emptyView: { alignItems: 'center', padding: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 25, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  modalLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, letterSpacing: 1 },
  modalInput: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20, fontSize: 16 },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  roleOption: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 2 },
  modalBtn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' }
});