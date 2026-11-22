import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

// All drawings use the same coordinate box so the tree's base always sits in the same spot.
export const TREE_BOX = { width: 200, height: 260 };
const BASE_X = 100;
const BASE_Y = 250;

const BARK = '#7A4E2D';
const BARK_DARK = '#5C3A21';
const LEAF = '#4FBF7F';
const LEAF_DARK = '#38996A';
const LEAF_LIGHT = '#7ADDA2';
const SOIL = '#6B4630';

/** Size of the trunk and leaves for each tree stage (3 and up). */
const TREE_SIZES: Record<number, { h: number; w: number; r: number }> = {
  3: { h: 55, w: 8, r: 26 },
  4: { h: 75, w: 11, r: 38 },
  5: { h: 92, w: 14, r: 50 },
  6: { h: 108, w: 17, r: 60 },
  7: { h: 118, w: 20, r: 70 },
};

/** The tree at a given growth stage (0 = seed ... 7 = mighty oak). */
export function TreeArt({ stage, size = 1 }: { stage: number; size?: number }) {
  return (
    <Svg width={TREE_BOX.width * size} height={TREE_BOX.height * size} viewBox={`0 0 ${TREE_BOX.width} ${TREE_BOX.height}`}>
      {stage === 0 && <Seed />}
      {stage === 1 && <Sprout leaves={2} height={22} />}
      {stage === 2 && <Sprout leaves={4} height={40} />}
      {stage >= 3 && <FullTree stage={Math.min(stage, 7)} />}
    </Svg>
  );
}

function Mound() {
  return <Ellipse cx={BASE_X} cy={BASE_Y} rx={34} ry={9} fill={SOIL} />;
}

function Seed() {
  return (
    <G>
      <Mound />
      <Ellipse cx={BASE_X} cy={BASE_Y - 8} rx={8} ry={6} fill="#C08A4E" />
      <Ellipse cx={BASE_X - 2} cy={BASE_Y - 10} rx={3} ry={2} fill="#E0B47E" />
    </G>
  );
}

function Leaf({ x, y, angle, len }: { x: number; y: number; angle: number; len: number }) {
  // A simple leaf shape, rotated around where it joins the stem.
  return (
    <G transform={`rotate(${angle} ${x} ${y})`}>
      <Path d={`M ${x} ${y} Q ${x + len / 2} ${y - len / 3} ${x + len} ${y} Q ${x + len / 2} ${y + len / 3} ${x} ${y} Z`} fill={LEAF} />
      <Line x1={x} y1={y} x2={x + len * 0.85} y2={y} stroke={LEAF_DARK} strokeWidth={1} />
    </G>
  );
}

function Sprout({ leaves, height }: { leaves: number; height: number }) {
  const top = BASE_Y - height;
  return (
    <G>
      <Mound />
      <Path d={`M ${BASE_X} ${BASE_Y - 4} Q ${BASE_X - 4} ${BASE_Y - height / 2} ${BASE_X} ${top}`} stroke="#3F9B5F" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Leaf x={BASE_X} y={top} angle={-35} len={20} />
      <Leaf x={BASE_X} y={top} angle={-145} len={20} />
      {leaves >= 4 && (
        <>
          <Leaf x={BASE_X - 1} y={top + height * 0.45} angle={-20} len={16} />
          <Leaf x={BASE_X - 1} y={top + height * 0.45} angle={-160} len={16} />
        </>
      )}
    </G>
  );
}

function FullTree({ stage }: { stage: number }) {
  const { h, w, r } = TREE_SIZES[stage];
  const top = BASE_Y - h;
  const cy = top - r * 0.35;
  const side = r * 0.72;
  return (
    <G>
      <Mound />
      {/* Trunk, wider at the bottom, with a couple of roots */}
      <Path d={`M ${BASE_X - w} ${BASE_Y} L ${BASE_X - w / 2} ${top} L ${BASE_X + w / 2} ${top} L ${BASE_X + w} ${BASE_Y} Z`} fill={BARK} />
      <Path d={`M ${BASE_X - w} ${BASE_Y} Q ${BASE_X - w * 2} ${BASE_Y} ${BASE_X - w * 2.4} ${BASE_Y + 2}`} stroke={BARK} strokeWidth={w * 0.5} fill="none" strokeLinecap="round" />
      <Path d={`M ${BASE_X + w} ${BASE_Y} Q ${BASE_X + w * 2} ${BASE_Y} ${BASE_X + w * 2.4} ${BASE_Y + 2}`} stroke={BARK} strokeWidth={w * 0.5} fill="none" strokeLinecap="round" />
      <Line x1={BASE_X - w * 0.2} y1={BASE_Y - 6} x2={BASE_X - w * 0.1} y2={top + 10} stroke={BARK_DARK} strokeWidth={2} />

      {/* Leaves: a dark layer behind, then lighter clusters on top */}
      <Circle cx={BASE_X - side} cy={cy + r * 0.45} r={side} fill={LEAF_DARK} />
      <Circle cx={BASE_X + side} cy={cy + r * 0.45} r={side} fill={LEAF_DARK} />
      <Circle cx={BASE_X} cy={cy} r={r} fill={LEAF} />
      <Circle cx={BASE_X - side * 0.9} cy={cy + r * 0.3} r={side * 0.85} fill={LEAF} />
      <Circle cx={BASE_X + side * 0.9} cy={cy + r * 0.3} r={side * 0.85} fill={LEAF} />
      <Circle cx={BASE_X - r * 0.3} cy={cy - r * 0.35} r={r * 0.35} fill={LEAF_LIGHT} opacity={0.8} />

      {/* Big tree gets blossoms, mighty oak gets golden apples */}
      {stage >= 6 &&
        [
          [-0.5, -0.1],
          [0.35, -0.4],
          [0.6, 0.35],
          [-0.75, 0.5],
          [0.1, 0.25],
        ].map(([dx, dy], i) => (
          <Circle key={i} cx={BASE_X + dx * r} cy={cy + dy * r} r={stage === 7 ? 6 : 4.5} fill={stage === 7 ? '#FFC94D' : '#FF9FC8'} />
        ))}
    </G>
  );
}

/** What's left after the lumberjack is done. */
export function Stump({ size = 1 }: { size?: number }) {
  return (
    <Svg width={TREE_BOX.width * size} height={TREE_BOX.height * size} viewBox={`0 0 ${TREE_BOX.width} ${TREE_BOX.height}`}>
      <Mound />
      <Rect x={BASE_X - 14} y={BASE_Y - 22} width={28} height={22} fill={BARK} />
      <Ellipse cx={BASE_X} cy={BASE_Y - 22} rx={14} ry={5} fill="#D9A86C" />
      <Ellipse cx={BASE_X} cy={BASE_Y - 22} rx={8} ry={2.8} fill="none" stroke="#B07A45" strokeWidth={1.2} />
      <Ellipse cx={BASE_X} cy={BASE_Y - 22} rx={3} ry={1.2} fill="#B07A45" />
    </Svg>
  );
}

/** The lumberjack's body, facing left. The axe is drawn separately so it can swing. */
export function Lumberjack({ size = 1 }: { size?: number }) {
  return (
    <Svg width={80 * size} height={120 * size} viewBox="0 0 80 120">
      {/* Legs and boots */}
      <Rect x={27} y={80} width={11} height={32} fill="#2E4C8F" />
      <Rect x={42} y={80} width={11} height={32} fill="#2E4C8F" />
      <Rect x={24} y={108} width={15} height={9} rx={3} fill="#4A2E1A" />
      <Rect x={41} y={108} width={15} height={9} rx={3} fill="#4A2E1A" />
      {/* Red plaid shirt */}
      <Rect x={22} y={46} width={36} height={38} rx={7} fill="#D7263D" />
      {[30, 40, 50].map((x) => (
        <Line key={`v${x}`} x1={x} y1={47} x2={x} y2={83} stroke="#8E1B2B" strokeWidth={2} opacity={0.6} />
      ))}
      {[56, 66, 76].map((y) => (
        <Line key={`h${y}`} x1={23} y1={y} x2={57} y2={y} stroke="#8E1B2B" strokeWidth={2} opacity={0.6} />
      ))}
      {/* Back arm */}
      <Rect x={50} y={50} width={9} height={26} rx={4} fill="#B81F33" />
      {/* Head, beard, beanie */}
      <Circle cx={40} cy={30} r={13} fill="#F2C09B" />
      <Path d="M 27 31 Q 28 50 40 50 Q 52 50 53 31 Q 46 37 40 37 Q 34 37 27 31 Z" fill="#7A4A22" />
      <Circle cx={34} cy={27} r={1.8} fill="#222" />
      <Circle cx={44} cy={27} r={1.8} fill="#222" />
      <Path d="M 26 24 Q 27 8 40 8 Q 53 8 54 24 Z" fill="#D7263D" />
      <Rect x={25} y={21} width={30} height={6} rx={3} fill="#A81C30" />
      <Circle cx={40} cy={7} r={4} fill="#F4F4F4" />
    </Svg>
  );
}

/** The axe, held at the bottom of the handle. Rotate it around the grip to swing. */
export function Axe({ size = 1 }: { size?: number }) {
  return (
    <Svg width={60 * size} height={70 * size} viewBox="0 0 60 70">
      <Rect x={27} y={6} width={6} height={58} rx={3} fill="#8B5A2B" />
      <Polygon points="27,6 6,0 4,24 27,20" fill="#C9CED6" />
      <Line x1={5} y1={1} x2={4} y2={23} stroke="#F1F3F6" strokeWidth={2} />
      <Circle cx={30} cy={60} r={6} fill="#F2C09B" />
    </Svg>
  );
}
