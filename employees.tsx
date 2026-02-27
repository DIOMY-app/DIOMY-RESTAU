/**
 * Employees Screen - O'PIED DU MONT Mobile
 * Gestion complète : Liste, Filtrage, Activation et Ajout
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal } from 'react-native';

// @ts-ignore
import { ScreenContainer } from './components/screen-container';
// @ts-ignore
import { useColors } from './hooks/use-colors';
// @ts-ignore
import { formatRole } from './lib/formatting';
// @ts-ignore
import { useApp } from './app-context';
// @ts-ignore
import { supabase } from './supabase';

type Role = 'admin' | 'manager' | 'waiter' | 'cashier' | 'chef';

export default function EmployeesScreen() {
  const colors = useColors();
  const { state } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // États pour le formulaire d'ajout
  const [isModalVisible, setModalVisible] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<Role>('waiter');

  const filteredEmployees = state.employees.filter((emp: any) => {
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

      Alert.alert("Succès", `${newEmpName} a été ajouté.`);
      setModalVisible(false);
      setNewEmpName('');
      setNewEmpPhone('');
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
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

  const handleDeleteEmployee = (id: string) => {
    Alert.alert(
      "Confirmation",
      "Supprimer définitivement cet employé ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            await supabase.from('employes').delete().eq('id', id);
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
            <Text style={[styles.title, { color: colors.foreground }]}>Personnel</Text>
            <TextInput
              style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.foreground }]}
              placeholder="Rechercher..."
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
                  <Text style={{ color: filterStatus === status ? '#fff' : colors.foreground, fontSize: 12, fontWeight: '600' }}>
                    {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : 'Inactifs'}
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
                    <Text style={{ color: colors.muted, fontSize: 13 }}>{emp.telephone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteEmployee(emp.id)}>
                    <Text style={{ color: colors.error, fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.roleBadge, { backgroundColor: colors.border }]}>
                    <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: 'bold' }}>
                      {formatRole(emp.role).toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: emp.est_actif ? colors.success : colors.error }]}
                    onPress={() => handleToggleStatus(emp.id, emp.est_actif)}
                  >
                    <Text style={styles.statusText}>{emp.est_actif ? 'Actif' : 'Inactif'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Ajouter un employé</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal d'ajout */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nouvel Employé</Text>
            
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Nom complet"
              placeholderTextColor={colors.muted}
              value={newEmpName}
              onChangeText={setNewEmpName}
            />

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Téléphone"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              value={newEmpPhone}
              onChangeText={setNewEmpPhone}
            />

            <Text style={{ color: colors.muted, marginBottom: 8, fontSize: 12 }}>RÔLE DANS L'ÉTABLISSEMENT</Text>
            <View style={styles.roleSelector}>
              {(['waiter', 'cashier', 'chef', 'manager'] as Role[]).map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setNewEmpRole(r)}
                  style={[styles.roleOption, { 
                    borderColor: newEmpRole === r ? colors.primary : colors.border,
                    backgroundColor: newEmpRole === r ? colors.primary + '10' : 'transparent'
                  }]}
                >
                  <Text style={{ color: newEmpRole === r ? colors.primary : colors.muted, fontSize: 12 }}>
                    {formatRole(r)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 1, backgroundColor: colors.border }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.foreground }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { flex: 2, backgroundColor: colors.primary }]} 
                onPress={handleAddEmployee}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Enregistrer</Text>
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
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 15 },
  searchInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  empCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  empName: { fontSize: 18, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  addBtn: { paddingVertical: 18, borderRadius: 12, marginTop: 10 },
  addBtnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15 },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  roleOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  modalBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' }
});