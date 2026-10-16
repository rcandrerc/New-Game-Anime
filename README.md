# New Game Anime

Base pra um jogo novo com visual anime. Começa com a **Shino**, a personagem que foi testada no Quimera Sandbox (/teste):
modelo VRoid bonito e leve pro celular, física de cabelo, franja, saia e busto, e animações naturais (Mixamo + Quaternius).

## O que tem aqui

| Pasta | O que é |
|---|---|
| `personagem/shino.glb` | A Shino pronta pro jogo (4,6 MB): texturas até 1024 px, partes juntadas por material (poucas draw calls), ossos com nomes simples (`hips`, `spine`, `head`, `upperarm.l`...), 23 animações e os dados da física dentro do arquivo |
| `personagem/vrm_char.js` | Código (Three.js) que prepara o modelo (material com luz e sombra no estilo anime) e roda a física do cabelo/saia a cada quadro (`VRMC.prep`, `VRMC.tick`) |
| `demo/` | Página de demonstração: a Shino com botões pra cada animação, física ligada, arraste pra girar |
| `tools/` | Ferramentas pra refazer a personagem ou trocar animações (`build_vrm.py`, leitor de FBX do Mixamo `fbxio.py`) |

## Ver a demonstração

Precisa abrir por um servidor (o navegador não deixa carregar o .glb direto do arquivo):

```
python3 -m http.server 8000
```

e abrir `http://localhost:8000/demo/` no navegador.

## Animações

| Nome no arquivo | Movimento | Origem |
|---|---|---|
| Idle_A | parada, respirando | Mixamo: Breathing Idle |
| Walking_A | andar feminino | Mixamo: Female Walk |
| Running_A | correr | Mixamo: Run Forward |
| Jump_Idle | no ar (vai e volta) | Mixamo: Jump |
| Fall_Idle | caindo | Mixamo: Falling Idle |
| Dodge_Forward | dash (pose de voo; o jogo inclina o corpo) | Mixamo: Front Flip (começo) |
| Jump_Full_Short | cambalhota encolhida (o jogo gira o corpo) | Quaternius UAL: NinjaJump |
| ataques, magias, defesa, dano, morte, sentar, interagir, pegar, machado, picareta | | Quaternius UAL |

O jogo é quem move a personagem (as animações ficam no lugar). No Quimera Sandbox, o pulo, a cambalhota e o dash
recebem altura, giro e inclinação feitos no código; num jogo novo dá pra fazer igual ou baixar versões com movimento.

## Refazer ou trocar animações

```
python3 tools/build_vrm.py Sendagaya_Shino.vrm UAL1_Standard.glb UAL2_Standard.glb personagem/shino.glb --mixamo pasta_dos_fbx/
```

- `Sendagaya_Shino.vrm`: github.com/madjin/vrm-samples (vroid/beta)
- `UAL1_Standard.glb`, `UAL2_Standard.glb`: github.com/adharshsivan/animationlibrary
- Os .fbx do Mixamo ficam no PC do André (pasta Downloads/mixamo): corrida, andar, parada, pulo, queda, cambalhota.
  Baixados em mixamo.com com o personagem padrão, FBX Binary, Without Skin, 30 FPS, In Place.
- Os cortes e tempos de cada animação ficam na tabela `MIX` do `build_vrm.py`. Detalhes em `tools/LEIAME.md`.

## Outros personagens disponíveis

A mesma coleção de onde veio a Shino (github.com/madjin/vrm-samples) tem outros modelos VRoid que a ferramenta converte igual:
Sakurada Fumiriya, Victoria Rubin, Vita, Vivi, Sendagaya Shibu, Darkness Shibu, AvatarSample A/B/C.
**Conferir a licença de cada um** (fica gravada no próprio .vrm) antes de usar num jogo pra vender. A Shino é CC0.

Veja `LICENCAS.md`.
