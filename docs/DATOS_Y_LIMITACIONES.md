# Datos, limitaciones y decisiones metodológicas

El dataset público es totalmente sintético y reproducible. No incorpora importes, marcas comerciales, productos, clientes ni registros de terceros.

Generación: Python `random.Random(20261112)`; 80 semanas, seis áreas, siete segmentos, 24 marcas y 350 productos. Cada semana-área selecciona 42 productos, resultando 20,160 registros.

Esta estructura está diseñada para probar filtros cruzados, KPI, ránkings, mapa de calor y sensibilidad de escenarios. Los resultados no constituyen desempeño de una empresa real. La unidad de valor es ficticia y no debe interpretarse como MXN, USD o EUR.

El proyecto web sí es funcional: todas sus operaciones en el navegador calculan sobre las filas del conjunto sintético, en vez de mostrar imágenes estáticas o resultados precalculados. Su valor radica en la ingeniería de software, el diseño de producto analítico y la reproducibilidad, no en afirmar éxitos empresariales no documentados.
