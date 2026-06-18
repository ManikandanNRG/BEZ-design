async function run() {
  const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR42mP8AwACgAD/wI/NggAAAABJRU5ErkJggg==';
  try {
     const resp = await fetch(base64);
     const blob = await resp.blob();
     console.log('Blob size:', blob.size);
  } catch(e) {
     console.log('Error:', e.message);
  }
}
run();
