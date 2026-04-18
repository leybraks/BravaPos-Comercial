import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from negocios.models import DetalleOrden

def ejecutar_aprendizaje_machine_learning():
    # 1. CARGA: Traemos los 50,000 registros
    data = DetalleOrden.objects.all().values(
        'orden__creado_en', 'producto_id', 'cantidad'
    )
    df = pd.DataFrame(list(data))

    # 2. PREPARACIÓN (Feature Engineering):
    # El modelo no entiende fechas, entiende números.
    df['orden__creado_en'] = pd.to_datetime(df['orden__creado_en'])
    df['dia_semana'] = df['orden__creado_en'].dt.dayofweek # 0-6
    df['hora'] = df['orden__creado_en'].dt.hour           # 0-23
    
    # Agrupamos por hora y producto para saber la demanda real
    df_final = df.groupby(['dia_semana', 'hora', 'producto_id'])['cantidad'].sum().reset_index()

    # 3. DIVISIÓN: ¿Qué queremos predecir?
    X = df_final[['dia_semana', 'hora', 'producto_id']] # Características (Inputs)
    y = df_final['cantidad']                           # Objetivo (Output)

    # 4. ENTRENAMIENTO (Aquí ocurre el Random Forest)
    # n_estimators=100 crea 100 árboles de decisión que votan entre sí
    modelo = RandomForestRegressor(n_estimators=100, random_state=42)
    modelo.fit(X, y)

    # 5. EVALUACIÓN (Para demostrar en clase que aprendió)
    predicciones = modelo.predict(X)
    error = mean_absolute_error(y, predicciones)
    precision = r2_score(y, predicciones)

    print(f"📊 Error promedio: {round(error, 2)} platos")
    print(f"📈 Precisión del modelo (R²): {round(precision * 100, 2)}%")

    # 6. GUARDAR EL CEREBRO
    joblib.dump(modelo, 'modelo_brava_mermas.pkl')
    return "Modelo entrenado con éxito"