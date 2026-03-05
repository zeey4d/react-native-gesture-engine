import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-native',
    'react-native-gesture-handler',
    'react-native-reanimated',
    'expo-sensors',
    'expo-haptics',
  ],
  treeshake: true,
  minify: false,
});
