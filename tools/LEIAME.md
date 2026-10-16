# Ferramentas da personagem (vieram do Quimera Sandbox, tools/vrm)

- Modelo: **Sendagaya Shino**, modelo de exemplo do VRoid Studio, licença **CC0** (gravada no próprio arquivo .vrm).
  Fonte usada: github.com/madjin/vrm-samples (vroid/beta/Sendagaya_Shino.vrm).
- Animações: **Quaternius Universal Animation Library 1 e 2**, licença **CC0** (quaternius.com).
  Fonte usada: github.com/adharshsivan/animationlibrary (UAL1_Standard.glb, UAL2_Standard.glb).
- Animações de movimento (corrida, andar, parada, pulo, queda, dash): **Mixamo** (Adobe), livres de royalties
  para usar dentro do jogo. Os arquivos .fbx **não** ficam no repositório (a licença não deixa redistribuir os arquivos
  soltos); só as animações já convertidas, dentro do `shino.glb`.

## Animações do Mixamo usadas

Baixar em mixamo.com com o personagem padrão: **FBX Binary, Without Skin, 30 FPS, In Place** (quando tiver).
Salvar com estes nomes numa pasta (ex.: `mixamo/`):

| arquivo | animação no Mixamo | vira no jogo |
|---|---|---|
| corrida.fbx | Run Forward (Female Run Forward) | Running_A |
| andar.fbx | Female Walk (Female Normal Walk) | Walking_A |
| parada.fbx | Breathing Idle | Idle_A |
| pulo.fbx | Jump (Jump In Place) | Jump_Idle (só o trecho no ar, vai e volta) |
| queda.fbx | Falling Idle (Mid-Air Falling Idle) | Fall_Idle (quando está descendo) |
| cambalhota.fbx | Front Flip (Big Front Flip) | Dodge_Forward: o impulso e os braços esticados do começo do mortal; o jogo inclina e faz o voo |

A cambalhota do jogo continua a da UAL (encolhida), porque o jogo já gira o corpo 360° e o mortal do Mixamo estica as pernas.
Os cortes e tempos ficam na tabela `MIX` do `build_vrm.py`. Faltando algum .fbx, aquele movimento continua com a UAL.

## Como refazer

1. `python3 tools/build_vrm.py Sendagaya_Shino.vrm UAL1_Standard.glb UAL2_Standard.glb shino.glb --mixamo mixamo/`
   (texturas até 1024 px, partes juntadas por material, sem expressões faciais, ossos com os nomes do kk.js,
   animações convertidas e salvas com os nomes KayKit que o jogo usa; o FBX é lido pelo `fbxio.py`, sem precisar de Blender)
   Sem `--mixamo` sai a versão só com as animações UAL.
2. (Quimera Sandbox) `tools/vrm_patch.py` era o script que punha a Shino no /teste daquele jogo; fica só de referência.
