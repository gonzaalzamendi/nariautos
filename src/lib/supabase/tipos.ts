// Tipos generados a partir del esquema de Supabase (no editar a mano).
// Regenerar: npx supabase gen types typescript --project-id <ref> > src/lib/supabase/tipos.ts
export type Json = string | number | boolean | null | { [clave: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      asignaciones: {
        Row: {
          id: number;
          orden_id: number;
          mecanico_id: number;
          minutos_estimados: number;
          inicio_en: string | null;
          fin_en: string | null;
          motivo_demora: string | null;
          creado_en: string;
        };
      };
      auditoria: {
        Row: {
          id: number;
          empleado_id: number | null;
          empleado_nombre: string | null;
          accion: string;
          entidad: string;
          entidad_id: string | null;
          detalle: Json | null;
          creado_en: string;
        };
      };
      clientes: {
        Row: {
          id: number;
          nombre: string;
          telefono: string;
          email: string | null;
          creado_en: string;
        };
      };
      consultas: {
        Row: {
          id: number;
          tipo: string;
          canal: string;
          estado: string;
          motivo_perdida: string | null;
          sucursal_id: number;
          vendedor_id: number | null;
          unidad_id: number | null;
          cliente_id: number;
          mensaje: string | null;
          simulacion: Json | null;
          precio_cotizado: number | null;
          bonificacion: number | null;
          financiacion_ofrecida: string | null;
          cotizada_en: string | null;
          creado_en: string;
          primera_respuesta_en: string | null;
          cerrada_en: string | null;
        };
      };
      empleados: {
        Row: {
          id: number;
          nombre: string;
          rol: string;
          sucursal_id: number | null;
          pin_hash: string;
          activo: boolean;
          intentos_fallidos: number;
          bloqueado_hasta: string | null;
          creado_en: string;
        };
      };
      encuestas: {
        Row: {
          id: number;
          turno_id: number;
          puntaje: number;
          comentario: string | null;
          creado_en: string;
        };
      };
      eventos_turno: {
        Row: {
          id: number;
          turno_id: number;
          estado: string;
          detalle: string | null;
          empleado_id: number | null;
          creado_en: string;
        };
      };
      fotos_unidad: {
        Row: {
          id: number;
          unidad_id: number;
          url: string | null;
          datos: string | null;
          mime: string | null;
          orden: number;
        };
      };
      historial_service: {
        Row: {
          id: number;
          vehiculo_id: number;
          turno_id: number | null;
          sucursal_id: number | null;
          fecha: string;
          km: number;
          servicio: string;
          trabajos: string | null;
        };
      };
      intentos_acceso: {
        Row: {
          id: number;
          empleado_id: number | null;
          exitoso: boolean;
          ip: string | null;
          creado_en: string;
        };
      };
      mecanicos: {
        Row: {
          id: number;
          nombre: string;
          sucursal_id: number;
          especialidad: string | null;
          activo: boolean;
        };
      };
      notificaciones: {
        Row: {
          id: number;
          tipo: string;
          turno_id: number | null;
          vehiculo_id: number | null;
          cliente_id: number;
          sucursal_id: number;
          mensaje: string;
          estado: string;
          canal: string | null;
          clave: string | null;
          programada_para: string;
          enviada_en: string | null;
          empleado_id: number | null;
          creado_en: string;
        };
      };
      ordenes_trabajo: {
        Row: {
          id: number;
          turno_id: number;
          km_ingreso: number;
          combustible_nivel: string;
          observaciones: string | null;
          danos_visibles: string | null;
          trabajos_solicitados: string;
          estado: string;
          km_egreso: number | null;
          trabajos_realizados: string | null;
          abierta_en: string;
          cerrada_en: string | null;
        };
      };
      promocion_unidad: {
        Row: {
          promocion_id: number;
          unidad_id: number;
        };
      };
      promociones: {
        Row: {
          id: number;
          sucursal_id: number | null;
          titulo: string;
          descripcion: string;
          vigente_desde: string;
          vigente_hasta: string;
          activa: boolean;
          creado_en: string;
        };
      };
      reservas_unidad: {
        Row: {
          id: number;
          unidad_id: number;
          vendedor_id: number;
          cliente_nombre: string;
          cliente_telefono: string | null;
          vence_en: string;
          estado: string;
          creado_en: string;
        };
      };
      seguimientos_consulta: {
        Row: {
          id: number;
          consulta_id: number;
          empleado_id: number | null;
          nota: string;
          creado_en: string;
        };
      };
      servicios: {
        Row: {
          id: number;
          nombre: string;
          descripcion: string | null;
          duracion_min: number;
          precio_orientativo: number | null;
          activo: boolean;
        };
      };
      solicitudes_publicas: {
        Row: {
          id: number;
          ip_hash: string;
          accion: string;
          creado_en: string;
        };
      };
      sucursales: {
        Row: {
          id: number;
          nombre: string;
          direccion: string;
          localidad: string;
          telefono: string;
          email: string | null;
          horario_atencion: string;
          lat: number | null;
          lng: number | null;
          tiene_taller: boolean;
          capacidad_boxes: number | null;
          taller_abre: string | null;
          taller_cierra: string | null;
          taller_referencia_id: number | null;
          km_a_referencia: number | null;
          activa: boolean;
        };
      };
      tasaciones: {
        Row: {
          id: number;
          cliente_id: number;
          sucursal_id: number;
          unidad_interes_id: number | null;
          marca: string;
          modelo: string;
          anio: number;
          km: number;
          estado_general: string;
          comentarios: string | null;
          fotos: Json;
          estado: string;
          valor_estimado: number | null;
          respuesta: string | null;
          respondida_por: number | null;
          respondida_en: string | null;
          creado_en: string;
        };
      };
      test_drives: {
        Row: {
          id: number;
          consulta_id: number;
          unidad_id: number | null;
          fecha: string;
          franja: string;
          estado: string;
        };
      };
      transferencias_unidad: {
        Row: {
          id: number;
          unidad_id: number;
          origen_id: number;
          destino_id: number;
          solicitada_por: number;
          motivo: string | null;
          estado: string;
          resuelta_por: number | null;
          resuelta_en: string | null;
          creado_en: string;
        };
      };
      turnos: {
        Row: {
          id: number;
          codigo: string;
          servicio_id: number;
          vehiculo_id: number;
          cliente_id: number;
          sucursal_origen_id: number;
          sucursal_taller_id: number;
          canal_origen: string;
          derivado: boolean | null;
          fecha: string;
          hora: string;
          duracion_min: number;
          estado: string;
          observaciones: string | null;
          creado_por: number | null;
          creado_en: string;
        };
      };
      unidades: {
        Row: {
          id: number;
          sucursal_id: number;
          marca: string;
          modelo: string;
          version: string | null;
          anio: number;
          km: number;
          condicion: string;
          precio: number;
          combustible: string;
          transmision: string;
          color: string | null;
          descripcion: string | null;
          estado: string;
          fecha_ingreso: string;
          fecha_venta: string | null;
          precio_venta: number | null;
          vendedor_id: number | null;
          creado_en: string;
        };
      };
      vehiculos: {
        Row: {
          id: number;
          patente: string;
          marca: string;
          modelo: string;
          anio: number | null;
          km_actual: number | null;
          cliente_id: number | null;
        };
      };
    };
    Views: {
      v_kpi_consultas: {
        Row: {
          sucursal_id: number | null;
          mes: string | null;
          canal: string | null;
          total: number | null;
          ganadas: number | null;
          perdidas: number | null;
          respondidas: number | null;
          horas_respuesta: number | null;
        };
      };
      v_kpi_demoras: {
        Row: {
          sucursal_id: number | null;
          mes: string | null;
          trabajos: number | null;
          demorados: number | null;
          minutos_demora: number | null;
        };
      };
      v_kpi_derivaciones: {
        Row: {
          sucursal_origen_id: number | null;
          sucursal_taller_id: number | null;
          mes: string | null;
          total: number | null;
        };
      };
      v_kpi_ocupacion: {
        Row: {
          sucursal_id: number | null;
          fecha: string | null;
          minutos_ocupados: number | null;
          minutos_capacidad: number | null;
        };
      };
      v_kpi_satisfaccion: {
        Row: {
          sucursal_id: number | null;
          mes: string | null;
          cantidad: number | null;
          suma: number | null;
        };
      };
      v_kpi_stock: {
        Row: {
          sucursal_id: number | null;
          disponibles: number | null;
          reservadas: number | null;
          antiguedad_prom_dias: number | null;
          mas_de_90_dias: number | null;
          valor_stock: number | null;
        };
      };
      v_kpi_turnos: {
        Row: {
          sucursal_id: number | null;
          mes: string | null;
          estado: string | null;
          total: number | null;
        };
      };
      v_kpi_ventas: {
        Row: {
          sucursal_id: number | null;
          mes: string | null;
          unidades: number | null;
          monto: number | null;
        };
      };
      v_ordenes: {
        Row: {
          id: number | null;
          turno_id: number | null;
          estado: string | null;
          km_ingreso: number | null;
          combustible_nivel: string | null;
          observaciones: string | null;
          danos_visibles: string | null;
          trabajos_solicitados: string | null;
          trabajos_realizados: string | null;
          km_egreso: number | null;
          abierta_en: string | null;
          cerrada_en: string | null;
          codigo: string | null;
          fecha: string | null;
          hora: string | null;
          sucursal_taller_id: number | null;
          sucursal_origen_id: number | null;
          derivado: boolean | null;
          turno_estado: string | null;
          servicio: string | null;
          duracion_min: number | null;
          patente: string | null;
          marca: string | null;
          modelo: string | null;
          cliente: string | null;
          asignacion_id: number | null;
          mecanico_id: number | null;
          mecanico: string | null;
          minutos_estimados: number | null;
          inicio_en: string | null;
          fin_en: string | null;
          motivo_demora: string | null;
          minutos_reales: number | null;
          demorado: boolean | null;
        };
      };
    };
  };
};

export type Fila<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type FilaVista<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];
