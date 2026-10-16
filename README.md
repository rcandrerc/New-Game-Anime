# New Game Anime

Base pra um jogo novo com visual anime: 12 personagens VRoid prontos pro celular, com física de cabelo, franja, saia e busto
e as mesmas 23 animações (Mixamo + Quaternius). A preferida até agora é a **Shino**.

**Página de teste:** https://rcandrerc.github.io/New-Game-Anime/ (escolhe o personagem em cima e a animação embaixo).

## O que tem aqui

| Pasta | O que é |
|---|---|
| `personagens/*.glb` | Os personagens prontos pro jogo (4 a 5,5 MB cada): texturas até 1024 px, partes juntadas por material (poucas draw calls), ossos com nomes simples (`hips`, `spine`, `head`, `upperarm.l`...), 23 animações e os dados da física dentro do arquivo |
| `js/vrm_char.js` | Código (Three.js) que prepara o modelo (material com luz e sombra no estilo anime) e roda a física do cabelo/roupa a cada quadro (`VRMC.prep`, `VRMC.tick`) |
| `index.html` | A página de teste |
| `tools/` | Ferramentas pra refazer a personagem ou trocar animações (`build_vrm.py`, leitor de FBX do Mixamo `fbxio.py`) |

## Personagens

| Arquivo | Nome | Licença |
|---|---|---|
| sendagaya_shino | Shino | CC0 |
| sendagaya_shibu | Shibu | CC0 |
| darkness_shibu | Darkness Shibu | CC0 |
| sakurada_fumiriya | Fumiriya | CC0 |
| victoria_rubin | Victoria Rubin | CC0 |
| vita | Vita | CC0 |
| vivi | Vivi | CC0 |
| hairsample_female / hairsample_male | Amostras de cabelo | CC0 |
| avatarsample_a / b / c | AvatarSample A, B, C | licença da VRoid (modelos de exemplo do VRoid Studio; conferir os termos antes de vender) |

Modelos de github.com/madjin/vrm-samples (pasta vroid). CC0 = domínio público, pode usar até em jogo pago.

Pra abrir a página no próprio PC: `python3 -m http.server 8000` na pasta do repositório e `http://localhost:8000/`.

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
python3 tools/build_vrm.py Sendagaya_Shino.vrm UAL1_Standard.glb UAL2_Standard.glb personagens/sendagaya_shino.glb --mixamo pasta_dos_fbx/
```

- os .vrm: github.com/madjin/vrm-samples (vroid/beta e vroid/stable)
- `UAL1_Standard.glb`, `UAL2_Standard.glb`: github.com/adharshsivan/animationlibrary
- Os .fbx do Mixamo ficam no PC do André (pasta Downloads/mixamo): corrida, andar, parada, pulo, queda, cambalhota.
  Baixados em mixamo.com com o personagem padrão, FBX Binary, Without Skin, 30 FPS, In Place.
- Os cortes e tempos de cada animação ficam na tabela `MIX` do `build_vrm.py`. Detalhes em `tools/LEIAME.md`.

Veja `LICENCAS.md`.
