#!/usr/bin/env node

/**
 * Script para optimizar imágenes de blog
 * 
 * Uso: node optimize-images.js
 * 
 * Este script procesará las imágenes en la carpeta public/images/posts
 * y creará versiones optimizadas tanto para móvil como para escritorio.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Verifica si se tienen las dependencias necesarias
try {
  execSync('npm list sharp --depth=0');
} catch (error) {
  console.log('Instalando dependencias necesarias...');
  execSync('npm install --save-dev sharp');
}

console.log('Cargando sharp...');
const sharp = require('sharp');

// Configuración
const config = {
  inputDir: path.join(__dirname, '../public/images/posts'),
  mobileWidth: 640,
  desktopWidth: 1200,
  quality: 80, // Balance entre calidad y tamaño
};

// Asegúrate de que el directorio exista
if (!fs.existsSync(config.inputDir)) {
  console.error(`El directorio ${config.inputDir} no existe.`);
  process.exit(1);
}

// Obtén todas las imágenes en el directorio
const imageFiles = fs.readdirSync(config.inputDir)
  .filter(file => 
    /\.(jpg|jpeg|png|webp)$/i.test(file) && 
    !file.includes('-m.webp') && 
    !file.includes('-desktop.webp')
  );

console.log(`Encontradas ${imageFiles.length} imágenes para optimizar`);

// Procesa cada imagen
(async () => {
  for (const file of imageFiles) {
    const inputPath = path.join(config.inputDir, file);
    const fileNameWithoutExt = path.parse(file).name;
    
    // Ruta para la versión móvil
    const mobileOutputPath = path.join(
      config.inputDir, 
      `${fileNameWithoutExt}-m.webp`
    );
    
    // Ruta para la versión de escritorio (si es necesario)
    const desktopOutputPath = path.join(
      config.inputDir, 
      `${fileNameWithoutExt}.webp`
    );

    console.log(`Procesando ${file}...`);

    try {
      // Obtén las dimensiones originales
      const metadata = await sharp(inputPath).metadata();
      
      // Optimiza para móvil
      await sharp(inputPath)
        .resize(config.mobileWidth, null, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: config.quality })
        .toFile(mobileOutputPath);
      
      console.log(`  ✓ Versión móvil creada: ${path.basename(mobileOutputPath)}`);
      
      // Optimiza para escritorio si la imagen original es más grande que mobileWidth
      if (metadata.width > config.mobileWidth) {
        // Mantén el tamaño original si es menor que desktopWidth, de lo contrario redimensiona
        const resizeWidth = metadata.width < config.desktopWidth ? metadata.width : config.desktopWidth;
        
        await sharp(inputPath)
          .resize(resizeWidth, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: config.quality })
          .toFile(desktopOutputPath);
        
        console.log(`  ✓ Versión escritorio creada: ${path.basename(desktopOutputPath)}`);
      } else {
        console.log('  ℹ La imagen es pequeña, no se necesita versión de escritorio');
      }
      
      // Imprime la reducción de tamaño
      const originalSize = fs.statSync(inputPath).size;
      const mobileSize = fs.statSync(mobileOutputPath).size;
      const reduction = ((originalSize - mobileSize) / originalSize * 100).toFixed(2);
      console.log(`  📊 Reducción de tamaño: ${reduction}% (de ${formatBytes(originalSize)} a ${formatBytes(mobileSize)})`);
      
    } catch (error) {
      console.error(`  ❌ Error procesando ${file}:`, error);
    }
  }
  
  console.log('\n✅ Optimización completada!');
  console.log('\nPara usar estas imágenes en tu blog:');
  console.log('1. En tu frontmatter, añade:');
  console.log('   image: "/images/posts/nombre-archivo.webp"');
  console.log('   mobileImage: "/images/posts/nombre-archivo-m.webp"');
})();

// Función para formatear bytes en formato legible
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
