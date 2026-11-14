import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nome da "gaveta" onde os dados ficam guardados no aparelho
const CHAVE_STORAGE = '@cadastro_alunos:dados';

// Opções que aparecem na lista de cursos (edite à vontade)
const CURSOS = [
  'Informática',
  'Administração',
  'Eletrônica',
  'Mecânica',
  'Edificações',
  'Enfermagem',
  'Hospedagem',
  'Design de Interiores',
];

export default function App() {
  // Controle de tela: 'cadastro' ou 'lista'
  const [tela, setTela] = useState('cadastro');

  // Dados
  const [alunos, setAlunos] = useState([
    { id: 1, nome: 'João', curso: 'Informática' },
    { id: 2, nome: 'Maria', curso: 'Administração' },
  ]);

  // Formulário
  const [nome, setNome] = useState('');
  const [curso, setCurso] = useState('');
  const [idEmEdicao, setIdEmEdicao] = useState(null);
  const [listaCursosAberta, setListaCursosAberta] = useState(false);
  const [busca, setBusca] = useState('');

  // Próximo id a ser usado (cresce sempre, nunca repete um id já usado)
  const [proximoId, setProximoId] = useState(3);
  // Indica se os dados salvos já foram lidos do aparelho
  const [carregado, setCarregado] = useState(false);

  // Ao abrir o app: lê os alunos salvos no aparelho
  useEffect(() => {
    async function carregarDados() {
      try {
        const salvo = await AsyncStorage.getItem(CHAVE_STORAGE);
        if (salvo !== null) {
          const dados = JSON.parse(salvo);
          const lista = dados.alunos || [];
          const maiorId = lista.reduce((max, a) => Math.max(max, a.id), 0);
          setAlunos(lista);
          // Garante que o próximo id nunca colida com um existente
          setProximoId(Math.max(dados.proximoId || 1, maiorId + 1));
        }
      } catch (erro) {
        Alert.alert('Erro', 'Não foi possível carregar os dados salvos.');
      } finally {
        setCarregado(true);
      }
    }
    carregarDados();
  }, []);

  // Sempre que a lista (ou o próximo id) mudar: salva no aparelho
  useEffect(() => {
    if (!carregado) return; // evita sobrescrever antes de ler
    async function salvarDados() {
      try {
        await AsyncStorage.setItem(
          CHAVE_STORAGE,
          JSON.stringify({ alunos, proximoId })
        );
      } catch (erro) {
        Alert.alert('Erro', 'Não foi possível salvar os dados.');
      }
    }
    salvarDados();
  }, [alunos, proximoId, carregado]);

  // O id é gerado automaticamente a partir de "proximoId" ao cadastrar.

  function limparFormulario() {
    setNome('');
    setCurso('');
    setIdEmEdicao(null);
  }

  // Validação compartilhada por cadastrar e salvar
  function validarCampos() {
    if (nome.trim() === '' || curso.trim() === '') {
      Alert.alert('Atenção', 'Preencha o nome e selecione o curso.');
      return false;
    }
    return true;
  }

  // CREATE
  function cadastrarAluno() {
    if (!validarCampos()) return;
    const novoAluno = { id: proximoId, nome: nome.trim(), curso: curso.trim() };
    setAlunos([...alunos, novoAluno]);
    setProximoId(proximoId + 1); // o próximo aluno recebe o id seguinte
    limparFormulario();
    Alert.alert('Sucesso', 'Aluno cadastrado!');
  }

  // Prepara a edição: carrega dados nos campos, guarda o id e abre o formulário
  function iniciarEdicao(aluno) {
    setNome(aluno.nome);
    setCurso(aluno.curso);
    setIdEmEdicao(aluno.id);
    setTela('cadastro');
  }

  // UPDATE: localiza pelo id com map()
  function salvarEdicao() {
    if (!validarCampos()) return;
    const listaAtualizada = alunos.map((aluno) =>
      aluno.id === idEmEdicao
        ? { ...aluno, nome: nome.trim(), curso: curso.trim() }
        : aluno
    );
    setAlunos(listaAtualizada);
    limparFormulario();
    setTela('lista');
    Alert.alert('Sucesso', 'Aluno atualizado!');
  }

  function cancelarEdicao() {
    limparFormulario();
    setTela('lista');
  }

  // DELETE: remove pelo id com filter()
  function excluirAluno(id) {
    setAlunos(alunos.filter((aluno) => aluno.id !== id));
    if (id === idEmEdicao) limparFormulario();
  }

  // Pede confirmação antes de excluir
  function confirmarExclusao(aluno) {
    // No navegador (web) o Alert não mostra botões, então usamos window.confirm
    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja excluir o aluno ${aluno.nome}?`)) {
        excluirAluno(aluno.id);
      }
      return;
    }

    Alert.alert(
      'Excluir aluno',
      `Deseja realmente excluir ${aluno.nome}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluirAluno(aluno.id),
        },
      ]
    );
  }

  function aoPressionarBotaoPrincipal() {
    if (idEmEdicao === null) cadastrarAluno();
    else salvarEdicao();
  }

  // Cada item da lista
  function renderAluno({ item }) {
    return (
      <View style={styles.item}>
        <View style={styles.itemTexto}>
          <Text style={styles.itemNome}>{item.nome}</Text>
          <Text style={styles.itemCurso}>
            ID {item.id} • {item.curso}
          </Text>
        </View>
        <Pressable
          style={[styles.botaoPequeno, styles.botaoEditar]}
          onPress={() => iniciarEdicao(item)}
        >
          <Text style={styles.botaoPequenoTexto}>Editar</Text>
        </Pressable>
        <Pressable
          style={[styles.botaoPequeno, styles.botaoExcluir]}
          onPress={() => confirmarExclusao(item)}
        >
          <Text style={styles.botaoPequenoTexto}>Excluir</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- TELA DE CADASTRO ----------
  function renderCadastro() {
    const editando = idEmEdicao !== null;
    return (
      <View style={styles.cartao}>
        <Text style={styles.titulo}>
          {editando ? 'Editar Aluno' : 'Cadastro de Alunos'}
        </Text>

        <Text style={styles.rotulo}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite o nome"
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.rotulo}>Curso</Text>
        <Pressable
          style={[styles.input, styles.seletor]}
          onPress={() => setListaCursosAberta(true)}
        >
          <Text
            style={curso === '' ? styles.seletorPlaceholder : styles.seletorTexto}
          >
            {curso === '' ? 'Selecione o curso' : curso}
          </Text>
          <Text style={styles.seta}>▼</Text>
        </Pressable>

        <Pressable
          style={styles.botaoPrincipal}
          onPress={aoPressionarBotaoPrincipal}
        >
          <Text style={styles.botaoPrincipalTexto}>
            {editando ? 'Salvar alteração' : 'Cadastrar'}
          </Text>
        </Pressable>

        {editando ? (
          <Pressable style={styles.botaoSecundario} onPress={cancelarEdicao}>
            <Text style={styles.botaoSecundarioTexto}>Cancelar edição</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.botaoSecundario}
            onPress={() => setTela('lista')}
          >
            <Text style={styles.botaoSecundarioTexto}>
              Ver alunos cadastrados ({alunos.length})
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ---------- TELA DE ALUNOS CADASTRADOS ----------
  // Filtra a lista pelo texto digitado: nome, curso ou id exato (aceita "#2")
  function filtrarAlunos() {
    const termo = busca.trim().toLowerCase().replace('#', '');
    if (termo === '') return alunos;
    return alunos.filter(
      (aluno) =>
        aluno.nome.toLowerCase().includes(termo) ||
        aluno.curso.toLowerCase().includes(termo) ||
        String(aluno.id) === termo
    );
  }

  function renderLista() {
    const alunosFiltrados = filtrarAlunos();
    return (
      <View style={[styles.cartao, styles.cartaoLista]}>
        <Text style={styles.titulo}>Alunos Cadastrados</Text>

        <TextInput
          style={styles.input}
          placeholder="Pesquisar por nome, curso ou ID"
          placeholderTextColor="#999"
          value={busca}
          onChangeText={setBusca}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FlatList
          data={alunosFiltrados}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAluno}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {alunos.length === 0
                ? 'Nenhum aluno cadastrado.'
                : 'Nenhum aluno encontrado para a pesquisa.'}
            </Text>
          }
        />

        <Pressable
          style={styles.botaoPrincipal}
          onPress={() => setTela('cadastro')}
        >
          <Text style={styles.botaoPrincipalTexto}>Voltar ao cadastro</Text>
        </Pressable>
      </View>
    );
  }

  // Enquanto lê os dados salvos, mostra um indicador de carregamento
  if (!carregado) {
    return (
      <View style={[styles.fundo, { alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fundo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {tela === 'cadastro' ? renderCadastro() : renderLista()}

      {/* Lista de cursos (abre ao tocar no campo Curso) */}
      <Modal
        visible={listaCursosAberta}
        transparent
        animationType="fade"
        onRequestClose={() => setListaCursosAberta(false)}
      >
        <Pressable
          style={styles.fundoModal}
          onPress={() => setListaCursosAberta(false)}
        >
          <View style={styles.caixaModal}>
            <Text style={styles.tituloModal}>Escolha o curso</Text>
            <FlatList
              data={CURSOS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.opcao,
                    item === curso && styles.opcaoSelecionada,
                  ]}
                  onPress={() => {
                    setCurso(item);
                    setListaCursosAberta(false);
                  }}
                >
                  <Text style={styles.opcaoTexto}>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const VINHO = '#722F37';
const VINHO_ESCURO = '#5A1F2A';

const styles = StyleSheet.create({
  // Fundo vinho ocupando a tela toda, com o cartão centralizado
  fundo: {
    flex: 1,
    backgroundColor: VINHO,
    justifyContent: 'center',
    padding: 24,
  },

  // Cartão branco de cantos arredondados no meio da tela
  cartao: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cartaoLista: { maxHeight: '85%' },

  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: VINHO,
    textAlign: 'center',
    marginBottom: 20,
  },
  rotulo: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    fontSize: 15,
  },

  // Seletor de curso
  seletor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seletorTexto: { fontSize: 15, color: '#000' },
  seletorPlaceholder: { fontSize: 15, color: '#999' },
  seta: { fontSize: 12, color: '#666' },

  // Botões grandes
  botaoPrincipal: {
    backgroundColor: VINHO,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  botaoPrincipalTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botaoSecundario: {
    borderWidth: 1.5,
    borderColor: VINHO,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  botaoSecundarioTexto: { color: VINHO, fontSize: 15, fontWeight: '600' },

  // Lista de alunos
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemTexto: { flex: 1 },
  itemNome: { fontSize: 16, fontWeight: '600', color: '#222' },
  itemCurso: { color: '#666', marginTop: 2 },
  vazio: { textAlign: 'center', color: '#888', marginVertical: 24 },
  botaoPequeno: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 6,
  },
  botaoEditar: { backgroundColor: '#2e7d32' },
  botaoExcluir: { backgroundColor: '#c62828' },
  botaoPequenoTexto: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Modal da lista de cursos
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 30,
  },
  caixaModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    maxHeight: '70%',
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: VINHO,
    marginBottom: 10,
  },
  opcao: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  opcaoSelecionada: { backgroundColor: '#f3e3e6' },
  opcaoTexto: { fontSize: 16, color: VINHO_ESCURO },
});