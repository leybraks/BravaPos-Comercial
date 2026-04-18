import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from negocios.models import DetalleOrden

def ejecutar_aprendizaje_machine_learning():
    data = DetalleOrden.objects.all().values(
        'orden__creado_en', 'producto_id', 'cantidad'
    )
    df = pd.DataFrame(list(data))

    df['orden__creado_en'] = pd.to_datetime(df['orden__creado_en'])
    df['fecha_exacta'] = df['orden__creado_en'].dt.date 
    df['dia_semana'] = df['orden__creado_en'].dt.dayofweek
    df['hora'] = df['orden__creado_en'].dt.hour
    
    df_diario = df.groupby(['fecha_exacta', 'dia_semana', 'hora', 'producto_id'])['cantidad'].sum().reset_index()

    X = df_diario[['dia_semana', 'hora', 'producto_id']]
    y = df_diario['cantidad']

    modelo = RandomForestRegressor(n_estimators=100, random_state=42)
    modelo.fit(X, y)

    joblib.dump(modelo, 'modelo_brava_mermas.pkl')
    return "Modelo entrenado con volumen diario realista"