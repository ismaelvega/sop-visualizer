Plan: voy a sacar del PDF (con citas) la descripción completa de la simulación/experimento: setup, señales, muestreo, clases, cómo inyectan ruido, cómo generan features y cómo evalúan; luego armo el reporte final sin mencionar limitaciones.


Bro — voy a leer el paper y armar un reporte donde la parte de simulación (cómo generan ruido, cómo lo superponen, features, splits y métricas) sea lo más dominante; omito por completo “limitations”.


Voy a ubicar en el PDF los párrafos exactos donde describen cómo generan/superponen el ruido y cómo arman el dataset, para poder reportarlo con precisión.


## Reporte del paper

**“Resilient Anomaly Detection in Fiber-Optic Networks: A Machine Learning Framework for Multi-Threat Identification Using State-of-Polarization Monitoring” (AI 2025, 6, 131)** 

---

## 1) Qué problema ataca y qué propone

El trabajo plantea un **marco de detección/clasificación de anomalías en redes de fibra óptica** usando **monitoreo en tiempo real del estado de polarización (SOP)**. Se enfoca en **tres escenarios de amenaza**: (i) vibraciones (benignas vs críticas), (ii) disturbios mecánicos superpuestos, y (iii) **tapping/eavesdropping** por manipulación física de la fibra. 

La idea central es que la **huella (fingerprint) de polarización** cambia cuando hay perturbaciones físicas, y esas huellas (en forma de series temporales) pueden clasificarse con **ML supervisado**. Para robustez, evalúan explícitamente qué pasa si al SOP se le **superpone ruido sinusoidal** a distintas frecuencias (para emular interferencia ambiental). 

---

## 2) Simulación / emulación de eventos y generación del dataset (la parte medular)

### 2.1. Señal base: SOP y cómo se representa (lo que realmente “miden”)

El SOP se representa con los **parámetros de Stokes**: **S0** (potencia/intensidad) y **S1, S2, S3** (coordenadas sobre la **esfera de Poincaré**). 

A partir de la evolución temporal de esos Stokes, derivan una señal clave: la **SOPAS (State-of-Polarization Angular Speed)**, que mide la “velocidad angular” con la que se mueve el vector de Stokes entre muestras sucesivas:
[
\omega[k] = \arccos\left(\frac{S_k\cdot S_{k-1}}{|S_k||S_{k-1}|}\right)\cdot \frac{1}{T_s}
]
donde (T_s) es el periodo de muestreo. 

En el enfoque del paper, **S1, S2, S3 y SOPAS** son el “núcleo” de información para discriminar eventos porque capturan cambios finos inducidos por perturbaciones mecánicas. 

---

### 2.2. Emulación de vibraciones: banco experimental (cómo “simulan” condiciones reales)

Para emular vibraciones de forma controlada, montan un **brazo robótico controlado por Arduino** que “sacude” una sección de fibra a distintas frecuencias (eventos). 

**Arquitectura del testbed (lo más importante):**

* Fuente láser **CW a 1530 nm**, potencia **6 dBm**, inyectada a la fibra de sensado. 
* Dos tramos de **SMF** de **8 km** y **5 km**, conectados a una sección de SMF que es la que manipula el brazo robótico. 
* El brazo Arduino está integrado en una **PCB** junto con driver y **Arduino UNO R3** para estabilidad. 
* En recepción conectan un spool adicional a un **polarímetro Novoptel PM1000**, que captura la evolución temporal de Stokes para extraer fingerprints. 
* Configuración de adquisición: **1500 muestras/segundo** y **ATE = 16** (Averaging Time Exponent). 

Con esto, generan series temporales de SOP (Stokes) y de SOPAS para cada “nivel” de vibración, y esas series conforman el dataset de entrenamiento/evaluación. 

---

### 2.3. Definición de clases y severidad (cómo etiquetan)

Definen 5 clases (con severidad) asociadas a la frecuencia de sacudida:

* **No event**: operación normal sin impacto.
* **Shaking 1 Hz**: baja severidad (ruido ambiental).
* **Shaking 3 Hz**: severidad moderada (disturbios menores).
* **Shaking 5 Hz**: alta severidad (estrés mecánico sostenido).
* **Shaking 10 Hz**: crítica (intrusión crítica). 

Además, observan en el “clean dataset” que al aumentar la frecuencia cambia el rango de oscilación de componentes (ej. S3), y lo usan como evidencia de que hay fingerprints diferenciables por frecuencia. 

---

### 2.4. “Simulación” de interferencia ambiental: superposición de ruido sinusoidal

El paper evalúa robustez agregando **ruido sinusoidal superpuesto** a distintas frecuencias para imitar ambientes donde la fibra (sobre todo en instalaciones “subsurface”/metropolitanas) está sometida a vibraciones externas no maliciosas. 

**Cómo lo aplican (lo que describen explícitamente):**

* Introducen **niveles de ruido** y reportan que las huellas de polarización por cada frecuencia de sacudida muestran **“shifts” / distorsión** al contaminarse con ruido. 
* Muestran un ejemplo concreto comparando dataset limpio vs dataset **contaminado con ruido de 3 Hz**, donde las líneas punteadas representan fingerprints afectados por el ruido y las sólidas la señal original. 
* Para evaluación cuantitativa, prueban el clasificador final con datasets con **ruido superpuesto de 1 Hz, 3 Hz y 5 Hz**, observando degradación progresiva del desempeño. 

**Qué concluyen del efecto del ruido (a nivel de fenómeno):**

* Con **3 Hz noise** aumenta la confusión entre clases “vecinas” (ej. 3 Hz vs 5 Hz), porque las firmas se vuelven más parecidas bajo interferencia. 
* Con **5 Hz noise** crecen los errores especialmente en clases de baja frecuencia (No event y 1 Hz), porque sus firmas son más sutiles y se “enmascaran” más fácil. 
* Los eventos de mayor severidad (10 Hz) tienden a conservar mejor su separabilidad. 

> Nota de fidelidad: el paper deja claro el *qué* (frecuencias de ruido, comparación clean vs noisy, y efectos), pero **no detalla en el texto mostrado** amplitud/fase exacta del seno ni el mecanismo matemático exacto de “inyección” sobre cada canal (Stokes/SOPAS). Aun así, sí documenta el procedimiento experimental de evaluar modelos sobre datasets “contaminados” por ruido a frecuencias específicas. 

---

### 2.5. Otros escenarios “simulados”/replicados: tapping y eventos superpuestos

#### a) Eavesdropping / tapping por macro-bending (replicación controlada)

Replican tapping con un dispositivo comercial **OFI (optical fiber identification)** que **dobla fuertemente** una fibra conectada a un cable metropolitano de **13 km**, causando fuga de luz y cambios en SOP. 
Hacen pruebas con clamp sostenido (~10 s en la figura) y mencionan repetición de experimentos ~50 veces para caracterizar la respuesta de Stokes. 
También calculan SOPAS (con Eq. 1) y reportan picos asociados al cierre del clamp (pico de ~2.5 rad/s). 

#### b) Eventos simultáneos (shaking + tapping)

Para “overlapping anomalies”, combinan **shaking** con brazo robótico (3 Hz) y **tapping manual** (1 golpe por segundo), sincronizados para crear eventos superpuestos. 
Reportan que con XGBoost su modelo logra **98%** y misclasifica **2.06%** de eventos de solapamiento. 

---

## 3) Pipeline de ML (resumen, pero con lo necesario para entender la simulación)

### 3.1. Inputs, split y labels

* Entrenan con **S1, S2, S3 y SOPAS**, con columna objetivo “Label” para las 5 clases. 
* Usan split **80/20** train/test. 

### 3.2. Feature engineering (clave para soportar ruido)

Para mejorar desempeño (especialmente al probar en datos no vistos y con ruido), añaden:

* **Rolling mean** y **rolling std** de S1/S2/S3/SOPAS, con ventanas **500 y 1000**. 
* **Lags** hasta **tercer orden** (capturar dependencias temporales cortas). 

El paper lo interpreta como transformar el SOP crudo en una representación de mayor dimensión que captura tendencias locales y transiciones, además de amortiguar fluctuaciones transitorias. 

---

## 4) Modelos evaluados y configuración (lo que usaron tal cual)

Evalúan 4 clasificadores supervisados: **Random Forest (RF), XGBoost, k-NN y Decision Tree**. 

Hiperparámetros reportados:

* **RF**: **100 árboles**, **max depth = 6**. 
* **XGBoost**: **150 árboles**, **learning rate = 0.4**. 
* **k-NN**: exploran (k) en rango **[5, 50]**. 
* **Decision Tree**: exploran profundidades **[3, 5, 10, 15, 20]**. 

---

## 5) Evaluación y resultados (con foco en “simulación de ruido”)

### 5.1. En dataset limpio

En clean dataset, RF sale mejor: **accuracy ~99.98%** (XGBoost ~99.93, k-NN ~95.08, DT ~99.72). 
También reportan AUC = 1.00 para los modelos tipo árbol, con RF ligeramente superior en separabilidad práctica entre etiquetas. 

### 5.2. Bajo datasets con ruido superpuesto (la prueba de “resiliencia”)

Prueban RF entrenado en limpio y lo evalúan en datasets con ruido a:

* **1 Hz noise** → **87.41%** accuracy
* **3 Hz noise** → **70.50%** accuracy
* **5 Hz noise** → **58.99%** accuracy 

Y con ROC/AUC para RF:

* Clean: **AUC 1.00**
* 1 Hz noise: **AUC 0.99**
* 3 Hz noise: **AUC 0.90**
* 5 Hz noise: **AUC 0.92** 

El paper interpreta que la degradación viene de que el ruido **distorsiona fingerprints** y vuelve menos separables los límites entre clases; además, explica que la superposición (p. ej. 3–5 Hz) puede solaparse “más destructivamente” con algunas firmas y elevar confusión. 

En una lectura por clase, destacan que las clases de baja frecuencia se degradan más y que las de alta frecuencia (10 Hz) conservan mayor estabilidad. 

---

## 6) Conclusión del paper (sin entrar a limitaciones)

El paper presenta un marco “ligero” de ML supervisado para **identificar múltiples amenazas** (vibraciones por severidad, eventos superpuestos y tapping) usando **SOP + SOPAS** como sensor indirecto. 
En sus pruebas, los modelos tipo árbol (especialmente **Random Forest**) logran desempeño muy alto en limpio y mantienen capacidad de detección razonable al introducir interferencia sinusoidal por frecuencia, lo que apoya la tesis de que los **fingerprints de polarización** contienen suficiente información para clasificar amenazas físicas en la fibra.  
